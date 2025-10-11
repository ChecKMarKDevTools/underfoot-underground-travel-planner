# Mermaid Diagrams: Underfoot System Documentation

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        U[User Browser]
        M[Mobile App]
    end

    subgraph "Frontend Layer"
        FE[React Frontend<br/>Port: 5173]
        VC[Vite Dev Server]
    end

    subgraph "Backend Layer"
        BE[Node.js API<br/>Port: 3000]
        MW[Middleware Stack]
        RT[Route Handlers]
    end

    subgraph "Optional Edge Layer"
        CF[Cloudflare Worker<br/>❓ Keep or Kill?]
    end

    subgraph "External APIs"
        OAI[OpenAI GPT]
        SERP[SERP API]
        RED[Reddit API]
        EVT[Eventbrite API]
        SUP[Supabase]
    end

    U --> FE
    M --> FE
    FE --> BE
    FE -.-> CF
    CF -.-> BE
    BE --> MW
    MW --> RT
    RT --> OAI
    RT --> SERP
    RT --> RED
    RT --> EVT
    RT --> SUP

    classDef primary fill:#8657D3,stroke:#E6679E,color:#fff
    classDef optional fill:#666,stroke:#999,color:#fff,stroke-dasharray: 5 5
    classDef external fill:#3BB8C8,stroke:#007F5F,color:#fff

    class FE,BE primary
    class CF optional
    class OAI,SERP,RED,EVT,SUP external
```

## 2. Data Flow: User Request to Response

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant AI as OpenAI
    participant EXT as External APIs

    U->>FE: Enter travel query
    FE->>FE: Show typing indicator
    FE->>BE: POST /underfoot/chat

    Note over BE: Rate limiting & sanitization

    BE->>AI: Generate search strategy
    AI-->>BE: Search parameters

    par Parallel API Calls
        BE->>EXT: Reddit search
        BE->>EXT: SERP search
        BE->>EXT: Eventbrite search
    and
        EXT-->>BE: Reddit results
        EXT-->>BE: SERP results
        EXT-->>BE: Event results
    end

    BE->>AI: Score & rank results
    AI-->>BE: Ranked items
    BE-->>FE: Response + items + debug
    FE->>FE: Render result cards
    FE-->>U: Display recommendations
```

## 3. Component Hierarchy

```mermaid
graph TD
    APP[App.jsx]

    APP --> HEADER[Header.jsx]
    APP --> CHAT[Chat.jsx]
    APP --> DEBUG[DebugSheet.jsx]

    CHAT --> MSG[Message Components]
    CHAT --> CARDS[ResultCard.jsx]
    CHAT --> LOAD[LoadingSkeleton.jsx]

    MSG --> TYPING[TypingIndicator]
    MSG --> BUBBLE[MessageBubble]

    CARDS --> IMG[Image Component]
    CARDS --> ACT[Action Buttons]

    DEBUG --> HIST[History Panel]
    DEBUG --> META[Metadata Display]

    classDef component fill:#1c1c25,stroke:#8657D3,color:#F5F7FA
    classDef new fill:#E6679E,stroke:#8657D3,color:#fff

    class APP,HEADER,CHAT,DEBUG component
    class LOAD,TYPING new
```

## 4. API Route Structure

```mermaid
graph LR
    subgraph "API Endpoints"
        ROOT[/]
        HEALTH[/health]
        CHAT[/underfoot/chat]
        NORM[/underfoot/normalize-location]
        SSE[/underfoot/chat?stream=true]
    end

    subgraph "Middleware Stack"
        CORS[CORS Handler]
        RATE[Rate Limiting]
        SAN[Input Sanitization]
        ERR[Error Handler]
    end

    subgraph "Route Handlers"
        SEARCH[Search Logic]
        AI[AI Integration]
        CACHE[Response Caching]
    end

    ROOT --> CORS
    HEALTH --> CORS
    CHAT --> CORS
    NORM --> CORS
    SSE --> CORS

    CORS --> RATE
    RATE --> SAN
    SAN --> SEARCH
    SAN --> AI
    SEARCH --> CACHE
    AI --> CACHE
    CACHE --> ERR

    classDef endpoint fill:#3BB8C8,stroke:#007F5F,color:#fff
    classDef middleware fill:#8657D3,stroke:#E6679E,color:#fff
    classDef handler fill:#E6679E,stroke:#8657D3,color:#fff

    class ROOT,HEALTH,CHAT,NORM,SSE endpoint
    class CORS,RATE,SAN,ERR middleware
    class SEARCH,AI,CACHE handler
```

## 5. Testing Strategy Overview

```mermaid
graph TB
    subgraph "Testing Pyramid"
        E2E[End-to-End Tests<br/>Playwright<br/>Critical user journeys]
        INT[Integration Tests<br/>API + Frontend<br/>Request/Response flow]
        UNIT[Unit Tests<br/>Components + Services<br/>96.99% coverage ✅]
    end

    subgraph "Test Automation"
        GHA[GitHub Actions]
        PR[Pull Request Checks]
        REL[Release Gates]
    end

    subgraph "Quality Gates"
        COV[Coverage > 95%]
        PERF[Performance Benchmarks]
        SEC[Security Scans]
        LINT[Code Quality]
    end

    UNIT --> INT
    INT --> E2E
    E2E --> GHA
    GHA --> PR
    PR --> REL

    REL --> COV
    REL --> PERF
    REL --> SEC
    REL --> LINT

    classDef test fill:#007F5F,stroke:#3BB8C8,color:#fff
    classDef automation fill:#8657D3,stroke:#E6679E,color:#fff
    classDef quality fill:#E6679E,stroke:#8657D3,color:#fff

    class UNIT,INT,E2E test
    class GHA,PR,REL automation
    class COV,PERF,SEC,LINT quality
```

## 6. Deployment Pipeline

```mermaid
graph LR
    subgraph "Development"
        DEV[Local Dev]
        FEAT[Feature Branch]
        PR[Pull Request]
    end

    subgraph "CI/CD Pipeline"
        TEST[Run Tests]
        BUILD[Build Assets]
        VER[Version Bump]
        TAG[Create Tag]
    end

    subgraph "Deployment"
        STAGE[Staging Deploy]
        PROD[Production Deploy]
        ROLL[Rollback Ready]
    end

    DEV --> FEAT
    FEAT --> PR
    PR --> TEST
    TEST --> BUILD
    BUILD --> VER
    VER --> TAG
    TAG --> STAGE
    STAGE --> PROD
    PROD --> ROLL

    classDef dev fill:#666,stroke:#999,color:#fff
    classDef ci fill:#3BB8C8,stroke:#007F5F,color:#fff
    classDef deploy fill:#E6679E,stroke:#8657D3,color:#fff

    class DEV,FEAT,PR dev
    class TEST,BUILD,VER,TAG ci
    class STAGE,PROD,ROLL deploy
```

## 7. Performance Monitoring

```mermaid
graph TD
    subgraph "Frontend Metrics"
        FCP[First Contentful Paint<br/>Target: < 1.5s]
        LCP[Largest Contentful Paint<br/>Target: < 2.5s]
        FID[First Input Delay<br/>Target: < 100ms]
        CLS[Cumulative Layout Shift<br/>Target: < 0.1]
    end

    subgraph "Backend Metrics"
        RES[Response Time<br/>Target: < 1s]
        THR[Throughput<br/>Target: > 100 RPS]
        ERR[Error Rate<br/>Target: < 1%]
        MEM[Memory Usage<br/>Target: < 512MB]
    end

    subgraph "Monitoring Tools"
        LIGHT[Lighthouse CI]
        NEWREL[New Relic]
        SENTRY[Sentry]
        GRAFANA[Grafana]
    end

    FCP --> LIGHT
    LCP --> LIGHT
    FID --> LIGHT
    CLS --> LIGHT

    RES --> NEWREL
    THR --> NEWREL
    ERR --> SENTRY
    MEM --> GRAFANA

    classDef frontend fill:#8657D3,stroke:#E6679E,color:#fff
    classDef backend fill:#3BB8C8,stroke:#007F5F,color:#fff
    classDef monitoring fill:#E6679E,stroke:#8657D3,color:#fff

    class FCP,LCP,FID,CLS frontend
    class RES,THR,ERR,MEM backend
    class LIGHT,NEWREL,SENTRY,GRAFANA monitoring
```

## 8. Security Architecture

```mermaid
graph TB
    subgraph "Input Layer"
        USER[User Input]
        API[API Requests]
    end

    subgraph "Security Middleware"
        RATE[Rate Limiting<br/>100 req/min]
        SAN[Input Sanitization<br/>XSS Prevention]
        VAL[Validation<br/>Schema Checking]
        CORS[CORS Policy<br/>Origin Restrictions]
    end

    subgraph "Application Layer"
        AUTH[Authentication<br/>JWT Tokens]
        AUTHZ[Authorization<br/>Role-based Access]
        ENCRYPT[Encryption<br/>Sensitive Data]
    end

    subgraph "Infrastructure"
        HTTPS[HTTPS Only]
        HEADERS[Security Headers]
        WAF[Web Application Firewall]
        LOG[Security Logging]
    end

    USER --> RATE
    API --> RATE
    RATE --> SAN
    SAN --> VAL
    VAL --> CORS
    CORS --> AUTH
    AUTH --> AUTHZ
    AUTHZ --> ENCRYPT

    ENCRYPT --> HTTPS
    HTTPS --> HEADERS
    HEADERS --> WAF
    WAF --> LOG

    classDef input fill:#666,stroke:#999,color:#fff
    classDef middleware fill:#8657D3,stroke:#E6679E,color:#fff
    classDef app fill:#3BB8C8,stroke:#007F5F,color:#fff
    classDef infra fill:#E6679E,stroke:#8657D3,color:#fff

    class USER,API input
    class RATE,SAN,VAL,CORS middleware
    class AUTH,AUTHZ,ENCRYPT app
    class HTTPS,HEADERS,WAF,LOG infra
```

---

_This document was generated with Verdent AI assistance._
