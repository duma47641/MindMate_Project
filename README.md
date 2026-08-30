# MindMate: A Multi-Modular Platform for Mental Health Tracking, Resource Management, and Doctor Appointments

MindMate is a full-stack, AI-integrated digital mental health ecosystem designed to bridge patient self-tracking with certified clinical teleconsultation. It combines interactive mood journaling, dynamic specialist scheduling, and real-time natural language processing (NLP) risk triage powered by a fine-tuned DistilBERT transformer.


## Key Features
 **Multi-Tier Role-Based Access (RBAC):** Distinct dashboards and security boundaries for Patients, Counselors, and Administrators.
 **Real-Time Clinical NLP Triage:** Domain-adapted DistilBERT model classifying conversational sentiment across 5 psychological states (Stress, Depression, Bipolar, Personality Disorder, Anxiety).
 **Dynamic Teleconsultation Scheduling:** End-to-end appointment lifecycle management with real-time status updates.
 **Specialist Priority Queue:** Clinical triage interface sorting high-risk patient assessments for prioritized intervention.
**Secure Persistence & API Layer:** JWT authentication, bcrypt password hashing, and scalable NoSQL storage.



## Technology Stack

 **Frontend:** React.js, Tailwind CSS, Lucide Icons, Axios
 **Application Server:** Node.js, Express.js (REST API Gateway)
 **AI Microservice:** Python 3.12, FastAPI, Uvicorn, PyTorch, Hugging Face Transformers (`distilbert-base-uncased`)
 **Database:** MongoDB
 **Testing & Tooling:** Postman, Git/GitHub, System Usability Scale (SUS)



## System Architecture

The platform adopts a 3-Tier Distributed Service-Oriented Architecture (SOA)
1. **Client Tier:** Responsive Single Page Application (SPA) in React.js.
2. **Business & Gateway Tier:** Express REST API managing authentication and MongoDB transactions.
3. **AI Inference Microservice:** FastAPI service processing text tokens and returning risk classifications.

