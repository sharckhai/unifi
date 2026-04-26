import type { JointId, JointPose } from "./types";

type BrowserAudioContext = typeof AudioContext;

type WindowWithWebkitAudioContext = Window & {
  AudioContext?: BrowserAudioContext;
  webkitAudioContext?: BrowserAudioContext;
};

type RobotAudioNodes = {
  context: AudioContext;
  masterGain: GainNode;
  servoGain: GainNode;
  rumbleGain: GainNode;
  hissGain: GainNode;
  servoOscillators: OscillatorNode[];
  servoFilter: BiquadFilterNode;
  rumbleSource: AudioBufferSourceNode;
  hissSource: AudioBufferSourceNode;
  modulationOscillator: OscillatorNode;
};

const JOINT_IDS: JointId[] = [
  "baseYaw",
  "shoulderPitch",
  "elbowPitch",
  "wrist1Pitch",
  "wrist2Yaw",
  "wrist3Roll",
];

const MOVEMENT_GAIN_THRESHOLD = 0.045;
const VELOCITY_NORMALIZATION_SCALE = 185;
const MASTER_OUTPUT_GAIN = 0.22;
const RUMBLE_OUTPUT_GAIN = 0.11;
const HISS_OUTPUT_GAIN = 0.075;
const MIN_SERVO_FREQUENCY = 145;
const SERVO_FREQUENCY_RANGE = 270;
const MIN_SERVO_FILTER_FREQUENCY = 720;
const MAX_SERVO_FILTER_FREQUENCY = 1850;
const PARAM_SMOOTHING_SECONDS = 0.055;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createBrownNoiseBuffer(context: AudioContext) {
  const length = context.sampleRate * 2;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const output = buffer.getChannelData(0);
  let lastSample = 0;

  for (let index = 0; index < length; index += 1) {
    const white = Math.random() * 2 - 1;
    lastSample = (lastSample + 0.02 * white) / 1.02;
    output[index] = lastSample * 3.5;
  }

  return buffer;
}

function getAudioContextConstructor() {
  const audioWindow = window as WindowWithWebkitAudioContext;

  return audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
}

function calculatePoseVelocity(previousPose: JointPose, pose: JointPose, deltaSeconds: number) {
  if (deltaSeconds <= 0) {
    return 0;
  }

  const totalVelocity = JOINT_IDS.reduce((sum, jointId) => {
    const deltaDegrees = pose[jointId] - previousPose[jointId];
    const velocity = Math.abs(deltaDegrees) / deltaSeconds;

    return sum + velocity * velocity;
  }, 0);

  return Math.sqrt(totalVelocity);
}

function createNoiseSource(context: AudioContext, noiseBuffer: AudioBuffer) {
  const source = context.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;
  source.start();

  return source;
}

function createAudioNodes(): RobotAudioNodes | null {
  const AudioContextConstructor = getAudioContextConstructor();

  if (!AudioContextConstructor) {
    return null;
  }

  const context = new AudioContextConstructor();
  const masterGain = context.createGain();
  const servoGain = context.createGain();
  const rumbleGain = context.createGain();
  const hissGain = context.createGain();
  const servoFilter = context.createBiquadFilter();
  const rumbleFilter = context.createBiquadFilter();
  const hissFilter = context.createBiquadFilter();
  const modulationOscillator = context.createOscillator();
  const modulationGain = context.createGain();
  const noiseBuffer = createBrownNoiseBuffer(context);
  const rumbleSource = createNoiseSource(context, noiseBuffer);
  const hissSource = createNoiseSource(context, noiseBuffer);
  const servoOscillators = [-5, 5].map((detune) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sawtooth";
    oscillator.frequency.value = MIN_SERVO_FREQUENCY;
    oscillator.detune.value = detune;
    modulationGain.connect(oscillator.frequency);
    oscillator.connect(servoFilter);
    oscillator.start();

    return oscillator;
  });

  masterGain.gain.value = 0;
  servoGain.gain.value = MASTER_OUTPUT_GAIN;
  rumbleGain.gain.value = 0;
  hissGain.gain.value = 0;

  servoFilter.type = "bandpass";
  servoFilter.frequency.value = MIN_SERVO_FILTER_FREQUENCY;
  servoFilter.Q.value = 3.8;

  rumbleFilter.type = "lowpass";
  rumbleFilter.frequency.value = 140;
  rumbleFilter.Q.value = 0.6;

  hissFilter.type = "bandpass";
  hissFilter.frequency.value = 1900;
  hissFilter.Q.value = 1.8;

  modulationOscillator.type = "sine";
  modulationOscillator.frequency.value = 7.2;
  modulationGain.gain.value = 8;

  modulationOscillator.connect(modulationGain);
  servoFilter.connect(servoGain);
  servoGain.connect(masterGain);
  rumbleSource.connect(rumbleFilter);
  rumbleFilter.connect(rumbleGain);
  rumbleGain.connect(masterGain);
  hissSource.connect(hissFilter);
  hissFilter.connect(hissGain);
  hissGain.connect(masterGain);
  masterGain.connect(context.destination);
  modulationOscillator.start();

  void context.suspend();

  return {
    context,
    masterGain,
    servoGain,
    rumbleGain,
    hissGain,
    servoOscillators,
    servoFilter,
    rumbleSource,
    hissSource,
    modulationOscillator,
  };
}

export function createRobotAudio() {
  let nodes: RobotAudioNodes | null = null;
  let previousPose: JointPose | null = null;
  let previousGripperOpen: number | null = null;
  let enabled = false;

  const ensureNodes = () => {
    if (!nodes) {
      nodes = createAudioNodes();
    }

    return nodes;
  };

  const triggerGripperHiss = () => {
    if (!nodes || !enabled) {
      return;
    }

    const { context, hissGain } = nodes;
    const now = context.currentTime;

    hissGain.gain.cancelScheduledValues(now);
    hissGain.gain.setValueAtTime(hissGain.gain.value, now);
    hissGain.gain.linearRampToValueAtTime(HISS_OUTPUT_GAIN, now + 0.018);
    hissGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  };

  const setEnabled = (nextEnabled: boolean) => {
    enabled = nextEnabled;
    const activeNodes = ensureNodes();

    if (!activeNodes) {
      return;
    }

    if (nextEnabled) {
      void activeNodes.context.resume();
      return;
    }

    activeNodes.masterGain.gain.setTargetAtTime(
      0,
      activeNodes.context.currentTime,
      PARAM_SMOOTHING_SECONDS,
    );
    window.setTimeout(() => {
      if (!enabled && activeNodes.context.state === "running") {
        void activeNodes.context.suspend();
      }
    }, 220);
  };

  const updateMotion = (pose: JointPose, gripperOpen: number, deltaSeconds: number) => {
    if (!previousPose) {
      previousPose = { ...pose };
      previousGripperOpen = gripperOpen;
      return;
    }

    const jointVelocity = calculatePoseVelocity(previousPose, pose, deltaSeconds);
    const velocityNorm = clamp(jointVelocity / VELOCITY_NORMALIZATION_SCALE, 0, 1);
    const movementGain =
      velocityNorm > MOVEMENT_GAIN_THRESHOLD ? velocityNorm * MASTER_OUTPUT_GAIN : 0;

    if (enabled && nodes) {
      const now = nodes.context.currentTime;
      const servoFrequency = MIN_SERVO_FREQUENCY + SERVO_FREQUENCY_RANGE * velocityNorm;
      const filterFrequency = clamp(
        servoFrequency * 1,
        MIN_SERVO_FILTER_FREQUENCY,
        MAX_SERVO_FILTER_FREQUENCY,
      );

      nodes.masterGain.gain.setTargetAtTime(movementGain, now, PARAM_SMOOTHING_SECONDS);
      nodes.rumbleGain.gain.setTargetAtTime(
        RUMBLE_OUTPUT_GAIN * velocityNorm * velocityNorm,
        now,
        PARAM_SMOOTHING_SECONDS,
      );
      nodes.servoFilter.frequency.setTargetAtTime(
        filterFrequency,
        now,
        PARAM_SMOOTHING_SECONDS,
      );

      nodes.servoOscillators.forEach((oscillator) => {
        oscillator.frequency.setTargetAtTime(
          servoFrequency,
          now,
          PARAM_SMOOTHING_SECONDS,
        );
      });
    }

    if (
      previousGripperOpen !== null &&
      Math.abs(gripperOpen - previousGripperOpen) > 0.16 &&
      velocityNorm > MOVEMENT_GAIN_THRESHOLD
    ) {
      triggerGripperHiss();
    }

    previousPose = { ...pose };
    previousGripperOpen = gripperOpen;
  };

  const dispose = () => {
    enabled = false;

    if (!nodes) {
      return;
    }

    const activeNodes = nodes;
    activeNodes.servoOscillators.forEach((oscillator) => oscillator.stop());
    activeNodes.rumbleSource.stop();
    activeNodes.hissSource.stop();
    activeNodes.modulationOscillator.stop();
    void activeNodes.context.close();
    nodes = null;
  };

  return {
    setEnabled,
    updateMotion,
    dispose,
  };
}
