export type MachineStatus = "running" | "warning" | "critical" | "maintenance";

export interface Machine {
  id: string;
  name: string;
  type: string;
  status: MachineStatus;

  temperature: number;
  vibration: number;
  current: number;
  speed: number;

  healthScore: number;
  failureProbability: number;

  x: number;
  y: number;
}

export const machines: Machine[] = [
  {
    id: "M-01",
    name: "CNC Milling",
    type: "CNC Machine",
    status: "running",
    temperature: 52.4,
    vibration: 2.1,
    current: 8.4,
    speed: 1450,
    healthScore: 92,
    failureProbability: 8,
    x: 18,
    y: 18,
  },

  {
    id: "M-02",
    name: "CNC Turning",
    type: "CNC Machine",
    status: "running",
    temperature: 55.2,
    vibration: 2.4,
    current: 9.1,
    speed: 1380,
    healthScore: 89,
    failureProbability: 11,
    x: 35,
    y: 18,
  },

  {
    id: "M-03",
    name: "Drilling",
    type: "Drilling Machine",
    status: "running",
    temperature: 49.8,
    vibration: 1.8,
    current: 7.6,
    speed: 1250,
    healthScore: 94,
    failureProbability: 6,
    x: 52,
    y: 18,
  },

  {
    id: "M-04",
    name: "Grinding",
    type: "Grinding Machine",
    status: "warning",
    temperature: 68.3,
    vibration: 4.2,
    current: 10.8,
    speed: 1180,
    healthScore: 71,
    failureProbability: 29,
    x: 69,
    y: 18,
  },

  {
    id: "M-05",
    name: "Assembly Robot 1",
    type: "Assembly Robot",
    status: "running",
    temperature: 45.2,
    vibration: 1.6,
    current: 6.2,
    speed: 980,
    healthScore: 96,
    failureProbability: 4,
    x: 25,
    y: 43,
  },

  {
    id: "M-06",
    name: "Assembly Robot 2",
    type: "Assembly Robot",
    status: "running",
    temperature: 47.1,
    vibration: 1.9,
    current: 6.8,
    speed: 1020,
    healthScore: 93,
    failureProbability: 7,
    x: 42,
    y: 43,
  },

  {
    id: "M-07",
    name: "Welding Robot",
    type: "Welding Robot",
    status: "warning",
    temperature: 72.6,
    vibration: 4.8,
    current: 14.2,
    speed: 860,
    healthScore: 64,
    failureProbability: 36,
    x: 59,
    y: 43,
  },

  {
    id: "M-08",
    name: "Conveyor A",
    type: "Conveyor",
    status: "running",
    temperature: 42.3,
    vibration: 2.0,
    current: 5.4,
    speed: 620,
    healthScore: 91,
    failureProbability: 9,
    x: 18,
    y: 68,
  },

  {
    id: "M-09",
    name: "Heat Treatment",
    type: "Heat Treatment",
    status: "critical",
    temperature: 86.4,
    vibration: 8.2,
    current: 13.6,
    speed: 1420,
    healthScore: 18,
    failureProbability: 92,
    x: 35,
    y: 68,
  },

  {
    id: "M-10",
    name: "Conveyor B",
    type: "Conveyor",
    status: "running",
    temperature: 43.8,
    vibration: 2.3,
    current: 5.8,
    speed: 640,
    healthScore: 88,
    failureProbability: 12,
    x: 52,
    y: 68,
  },

  {
    id: "M-11",
    name: "Packaging",
    type: "Packaging Machine",
    status: "critical",
    temperature: 82.1,
    vibration: 7.4,
    current: 12.8,
    speed: 740,
    healthScore: 24,
    failureProbability: 86,
    x: 69,
    y: 68,
  },
];