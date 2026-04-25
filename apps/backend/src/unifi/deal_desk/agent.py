"""Gemini-driven Deal-Desk-Agent loop.

Loads the system prompt, registers the five tools as Gemini function
declarations, runs a manual tool-call loop, and parses the final
structured Offer.

The PDF path is bound into `analyze_pdf_inquiry` at session-creation time
so the LLM does not need to handle filesystem paths — it just calls the
tool with no arguments.
"""

from __future__ import annotations

import dataclasses
import json
import logging
from pathlib import Path
from typing import Any

from google import genai
from google.genai import types

from unifi.core.config import Settings, get_settings
from unifi.deal_desk import tools as dd_tools
from unifi.deal_desk.schema import Offer

PROMPT_PATH = (
    Path(__file__).resolve().parents[5]
    / "docs"
    / "non-technical-concept"
    / "deal-desk-agent-prompt.md"
)

MAX_TOOL_TURNS = 12

logger = logging.getLogger(__name__)


_TOOL_DECLARATIONS: list[types.FunctionDeclaration] = [
    types.FunctionDeclaration(
        name="analyze_pdf_inquiry",
        description=(
            "Extract the structured customer inquiry from the attached PDF. "
            "Call exactly once at the start of the workflow."
        ),
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={},
        ),
    ),
    types.FunctionDeclaration(
        name="get_robots",
        description=(
            "List available robots with one-line use-case hints. "
            "Must be called before get_robot_infos."
        ),
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={},
        ),
    ),
    types.FunctionDeclaration(
        name="get_robot_infos",
        description=(
            "Full datasheet and suitability info for a single robot. "
            "Must be called only after get_robots."
        ),
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "robot_name": types.Schema(
                    type=types.Type.STRING,
                    description="Robot name from get_robots, e.g., 'UR5' or 'SCARA'.",
                ),
            },
            required=["robot_name"],
        ),
    ),
    types.FunctionDeclaration(
        name="get_pricing_history",
        description=(
            "Return a €/pick curve over the wear-multiplier spectrum for the "
            "given weight class. Despite the name, this is NOT a time-series — "
            "it samples four operating points so you can quote a defensible range."
        ),
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "robot_name": types.Schema(type=types.Type.STRING),
                "weight_class": types.Schema(
                    type=types.Type.STRING,
                    enum=["light", "medium", "heavy"],
                ),
                "timestep": types.Schema(
                    type=types.Type.STRING,
                    enum=["monthly", "quarterly", "yearly"],
                ),
            },
            required=["robot_name", "weight_class", "timestep"],
        ),
    ),
    types.FunctionDeclaration(
        name="vergleich_leasing_and_unifi",
        description=(
            "Cash-flow comparison between classical equipment leasing and a "
            "UNIFI Pay-per-Pick arrangement. Pass the median €/pick from "
            "get_pricing_history as expected_eur_per_pick."
        ),
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "robot_name": types.Schema(type=types.Type.STRING),
                "fleet_size": types.Schema(type=types.Type.INTEGER),
                "term_months": types.Schema(type=types.Type.INTEGER),
                "expected_picks_per_month": types.Schema(type=types.Type.INTEGER),
                "expected_eur_per_pick": types.Schema(type=types.Type.NUMBER),
            },
            required=[
                "robot_name",
                "fleet_size",
                "term_months",
                "expected_picks_per_month",
                "expected_eur_per_pick",
            ],
        ),
    ),
]


def _model_to_jsonable(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    if isinstance(value, list):
        return [_model_to_jsonable(v) for v in value]
    return value


@dataclasses.dataclass
class AgentResult:
    offer: Offer
    raw_text: str
    tool_calls: list[tuple[str, dict[str, Any]]]


def load_prompt() -> str:
    return PROMPT_PATH.read_text()


def _dispatch_tool(
    name: str,
    args: dict[str, Any],
    pdf_path: str,
    session: dd_tools.ToolSession,
) -> Any:
    if name == "analyze_pdf_inquiry":
        return dd_tools.analyze_pdf_inquiry(pdf_path, session)
    if name == "get_robots":
        return dd_tools.get_robots(session)
    if name == "get_robot_infos":
        return dd_tools.get_robot_infos(args["robot_name"], session)
    if name == "get_pricing_history":
        return dd_tools.get_pricing_history(
            args["robot_name"], args["weight_class"], args["timestep"]
        )
    if name == "vergleich_leasing_and_unifi":
        return dd_tools.vergleich_leasing_and_unifi(
            robot_name=args["robot_name"],
            fleet_size=args["fleet_size"],
            term_months=args["term_months"],
            expected_picks_per_month=args["expected_picks_per_month"],
            expected_eur_per_pick=args["expected_eur_per_pick"],
        )
    raise ValueError(f"Unknown tool: {name}")


def _final_output_instruction() -> str:
    schema_hint = json.dumps(Offer.model_json_schema(), indent=2)
    return (
        "When you have all the information you need, stop calling tools and "
        "respond with ONE message containing only a JSON object that conforms "
        "to the Offer schema below. No prose outside the JSON, no markdown "
        "code fences, no commentary.\n\n"
        f"Offer schema:\n{schema_hint}"
    )


def run_agent(pdf_path: str, settings: Settings | None = None) -> AgentResult:
    settings = settings or get_settings()
    if settings.gemini_api_key is None:
        raise RuntimeError(
            "GEMINI_API_KEY not configured. Set it in the environment "
            "(GEMINI_API_KEY, GOOGLE_API_KEY, or UNIFI_GEMINI_API_KEY)."
        )

    client = genai.Client(api_key=settings.gemini_api_key.get_secret_value())
    session = dd_tools.ToolSession(client=client, model=settings.gemini_model)

    system_instruction = load_prompt() + "\n\n" + _final_output_instruction()
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        tools=[types.Tool(function_declarations=_TOOL_DECLARATIONS)],
        temperature=0.2,
    )

    history: list[types.Content] = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(
                    text=(
                        f"A new Pay-per-Pick inquiry just arrived. The PDF is "
                        f"available at: {pdf_path}\n\n"
                        "Begin the workflow now."
                    )
                )
            ],
        )
    ]

    tool_calls: list[tuple[str, dict[str, Any]]] = []
    final_text: str | None = None

    for turn in range(MAX_TOOL_TURNS):
        response = session.client.models.generate_content(
            model=session.model,
            contents=history,
            config=config,
        )

        candidate = response.candidates[0]
        history.append(candidate.content)

        function_calls = [
            part.function_call
            for part in (candidate.content.parts or [])
            if part.function_call
        ]

        if not function_calls:
            text_parts = [
                part.text for part in (candidate.content.parts or []) if part.text
            ]
            final_text = "".join(text_parts).strip()
            break

        response_parts: list[types.Part] = []
        for fc in function_calls:
            args = dict(fc.args or {})
            tool_calls.append((fc.name, args))
            try:
                result = _dispatch_tool(fc.name, args, pdf_path, session)
                payload = {"result": _model_to_jsonable(result)}
            except dd_tools.SequencingError as exc:
                payload = {"error": str(exc)}
            except Exception as exc:  # noqa: BLE001 — surface any tool error to the model
                logger.warning("tool %s failed: %s", fc.name, exc)
                payload = {"error": f"{type(exc).__name__}: {exc}"}
            response_parts.append(
                types.Part.from_function_response(name=fc.name, response=payload)
            )

        history.append(types.Content(role="user", parts=response_parts))
    else:
        raise RuntimeError(
            f"Agent did not produce a final answer within {MAX_TOOL_TURNS} turns."
        )

    if not final_text:
        raise RuntimeError("Agent produced an empty final response.")

    cleaned = final_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].lstrip()
    offer = Offer.model_validate_json(cleaned)

    return AgentResult(offer=offer, raw_text=final_text, tool_calls=tool_calls)
