import type { Dispatcher, DispatcherDetails } from "../types";

export const predefinedDispatchers: Dispatcher[] = [
  {
    id: "CG-001",
    name: "Rodel Sustiguer",
    contactNumber: "0967 123 0987",
    email: "rodelsustiguer@gmail.com",
    createdAt: "September 3, 2025",
  },
  {
    id: "CG-002",
    name: "Gwyneth Uy",
    contactNumber: "0945 123 9876",
    email: "gwynethuy@gmail.com",
    createdAt: "September 1, 2025",
  },
  {
    id: "CG-003",
    name: "Carl James Juliane",
    contactNumber: "0908 765 4321",
    email: "carljames@gmail.com",
    createdAt: "August 30, 2025",
  },
  {
    id: "CG-004",
    name: "Bea Lugtu",
    contactNumber: "0928 456 7891",
    email: "bealugtu@gmail.com",
    createdAt: "August 30, 2025",
  },
];

export const predefinedDispatcherDetails: Record<string, DispatcherDetails> = {
  "CG-001": {
    id: "CG-001",
    name: "Rodel Sustiguer",
    contactNumber: "0967 123 0987",
    email: "rodelsustiguer@gmail.com",
    createdAt: "September 3, 2025",
    createdBy: "Franxine Orias",
    photo:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
  },
  "CG-002": {
    id: "CG-002",
    name: "Gwyneth Uy",
    contactNumber: "0945 123 9876",
    email: "gwynethuy@gmail.com",
    createdAt: "September 1, 2025",
    createdBy: "Franxine Orias",
    photo:
      "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=400&h=400&fit=crop&crop=face",
  },
  "CG-003": {
    id: "CG-003",
    name: "Carl James Juliane",
    contactNumber: "0908 765 4321",
    email: "carljames@gmail.com",
    createdAt: "August 30, 2025",
    createdBy: "Franxine Orias",
    photo:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
  },
  "CG-004": {
    id: "CG-004",
    name: "Bea Lugtu",
    contactNumber: "0928 456 7891",
    email: "bealugtu@gmail.com",
    createdAt: "August 30, 2025",
    createdBy: "Franxine Orias",
  },
};
