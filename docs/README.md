# Documentation Index

## Structure

### 📐 Architecture (`/architecture`)

Design decisions, architectural patterns, and system diagrams.

- [Architecture Decisions](architecture/ARCHITECTURE_DECISION.md) - Core architectural choices
- [Frontend Design ADR](architecture/FRONTEND_DESIGN_ADR.md) - Frontend architecture decisions
- [Data Retrieval ADR](architecture/DATA_RETRIEVAL_ADR.md) - Data fetching strategies
- [System Diagrams](architecture/MERMAID_DIAGRAMS.md) - Visual system architecture

### 🛠️ Technical Guides (`/tech_guides`)

Setup instructions, deployment guides, and technical reference.

- [Integration Plan](tech_guides/INTEGRATION_PLAN.md) - Backend-Supabase-Frontend integration
- [Environment Variables](tech_guides/ENVIRONMENT_VARIABLES.md) - All env vars explained
- [Deployment Guide](tech_guides/DEPLOYMENT_GUIDE.md) - Production deployment
- [Cloudflare Deployment](tech_guides/CLOUDFLARE_DEPLOYMENT_STRATEGY.md) - Cloudflare Workers setup
- [Testing Guide](tech_guides/TESTING.md) - Testing strategy and setup
- [Supabase Cleanup](tech_guides/SUPABASE_CLEANUP_STRATEGY.md) - Database maintenance

### 👥 User Guides (`/user_guides`)

End-user documentation and testing procedures.

- [Chat UI Guide](user_guides/CHAT_UI_README.md) - Using the chat interface
- [Manual Testing](user_guides/MANUAL_SANITY_TEST.md) - Testing checklist

### 📋 Planning (`/planning`)

Project planning, roadmaps, and historical context.

- [Development Plan](planning/DEVELOPMENT_PLAN.md) - Overall development roadmap
- [Implementation Plan](planning/IMPLEMENTATION_PLAN.md) - Feature implementation details
- [Implementation Summary](planning/IMPLEMENTATION_SUMMARY.md) - What's been built
- [Python Migration Summary](planning/PYTHON_MIGRATION_SUMMARY.md) - JS to Python migration
- [Setup Complete](planning/SETUP_COMPLETE.md) - Initial backend setup
- [Orchestration Plan](planning/ORCHESTRATION_PLAN.md) - Backend orchestration
- [Research Spikes](planning/RESEARCH_SPIKES.md) - Technical research
- [Future Enhancements](planning/FUTURE_ENHANCEMENTS.md) - Roadmap items
- [Results Strategy](planning/RESULTS_STRATEGY_V1.md) - Results handling
- [Project Journey](planning/JOURNEY.md) - Development history
- [Native Chat Vision](planning/NATIVE_CHAT_VISION.md) - Chat feature vision
- [Baseline Status](planning/BASELINE_STATUS.md) - Project baseline
- [Project Updates](planning/PROJECT_UPDATE_SUMMARY.md) - Progress summaries
- [TTD Immediate](planning/TTD_IMMEDIATE.md) - Immediate tasks

### 🎨 Assets (`/assets`)

Images, logos, and other media files.

- [Logo](assets/underfoot-logo.png)
- [Banner](assets/underfoot-banner.png)

### 📊 Data

Example data and configurations.

- [Color Palette](color_palette.json) - Design system colors
- [Example Chat Output](example-chat-output.json) - Sample chat responses

## Quick Start

1. **New Developer Setup**
   - Read [Architecture Decisions](architecture/ARCHITECTURE_DECISION.md)
   - Follow [Integration Plan](tech_guides/INTEGRATION_PLAN.md)
   - Configure [Environment Variables](tech_guides/ENVIRONMENT_VARIABLES.md)

2. **Deployment**
   - See [Integration Plan](tech_guides/INTEGRATION_PLAN.md) for full flow
   - For Cloudflare: [Cloudflare Deployment](tech_guides/CLOUDFLARE_DEPLOYMENT_STRATEGY.md)

3. **Testing**
   - Run tests: [Testing Guide](tech_guides/TESTING.md)
   - Manual checks: [Manual Testing](user_guides/MANUAL_SANITY_TEST.md)

## Environment Files

- **Frontend**: `/frontend/.env.example` - Browser app configuration
- **Backend**: `/backend/.env.example` - Server configuration
- **Supabase**: `/supabase/.env.example` - Database configuration

No root `.env` file is used - each service has its own environment configuration.
