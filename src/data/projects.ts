/**
 * Hardcoded project data for Phase 1.
 *
 * In Phase 2 this gets replaced by a query to your Postgres `projects` table,
 * managed via the /admin/projects UI. For now, edit this file and push to
 * update the showcase.
 */

import type { Project } from "@/components/ProjectCard";

export const projects: Project[] = [
  {
    title: "SecureLog-AES",
    description:
      "RSA encryption / decryption service with audit logging. React frontend, FastAPI backend, PostgreSQL for log storage, all containerized with Docker. Built for the Blueprint Dev Challenge.",
    github: "https://github.com/itscollinvo/Blueprint-Dev-Challenge-SecureLog",
  },
  {
    title: "Oshibana Flower Classifier",
    description:
      "PyTorch neural net classifying iris species, optimized via weight pruning and FP16 quantization. Held 93% accuracy while shrinking model size by ~9%.",
    github: "https://github.com/itscollinvo/Oshibana-Flower-Classifier",
  },
  {
    title: "Airbnb Price Predictor",
    description:
      "ML regression on the NYC 2019 Airbnb dataset to estimate listing prices. Pandas + Scikit-learn for the model, served through a FastAPI backend.",
    github: "https://github.com/itscollinvo/Airbnb-Price-Predictor",
  },
];
