# Agents.md Ecosystem Analyzer

An intelligent dashboard to visualize the adoption and growth of the `agents.md` protocol across the GitHub ecosystem.

## 🚀 Overview

This application acts as a central registry and analytics platform for AI Agents. It automatically discovers repositories containing `agents.md` files (the emerging standard for agentic metadata) and presents insights on their distribution, technologies, and health.

### Key Features
-   **Real-time Ecosystem Scan**: Tracks total adoption daily.
-   **Tech Stack Analysis**: Automatically detects languages and frameworks used by agentic projects.
-   **Smart Filtering**: Filters out low-quality forks and empty templates.
-   **Zero-Maintenance**: Fully automated data pipeline.

> **Data Quality**: All `AGENTS.md` file paths are validated during collection to ensure accuracy. Data refreshes daily via GitHub Actions.

## 🏗 Architecture: Git Scraping

This project uses a serverless **Git Scraping** architecture to ensure high performance and zero database costs.

1.  **Discovery (GitHub Actions)**:
    -   A daily workflow (`.github/workflows/daily-update.yml`) runs the collection script.
    -   The script uses a **Recursive Bisection Algorithm** to scan the entire GitHub ecosystem (0KB - 100KB) without hitting the 1000-result API limit.
    -   It identifies valid repositories, fetches metadata via GraphQL, and filters outliers.
2.  **Storage (Git)**:
    -   The processed data is saved to `public/data.json`.
    -   The Action commits this file back to the repository.
3.  **Presentation (React/Vite)**:
    -   The frontend is a static SPA that fetches `data.json` at runtime.
    -   Vercel automatically redeploys when the data file is updated.

## 🛠️ Local Development

### Prerequisites
-   Node.js 18+
-   A GitHub Personal Access Token (`GH_PAT`) with `public_repo` scope (only for running the fetch script).

### Setup

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Start the frontend**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:5173](http://localhost:5173) to view the dashboard (uses cached data by default).

### Running the Data Fetcher Locally

To test the data collection pipeline:

1.  **Set Environment Variables**:
    Create a `.env` file (do NOT commit this):
    ```env
    GH_PAT=your_github_token_here
    ```

2.  **Run the Script**:
    ```bash
    # Run the recursive bisection scan
    GH_PAT=your_token node scripts/fetch-data.mjs
    ```
    This will generate a fresh `public/data.json`.

## 🧠 Core Algorithm: Recursive Bisection

To bypass GitHub's 1000-result limit for Code Search, we implemented an **Adaptive Recursive Partitioning** strategy:
-   The script probes a file size range (e.g., `0..100KB`).
-   If results > 1000, it splits the range in half (`0..50KB`, `50..100KB`) and recurses.
-   This statistically guarantees finding **every** `agents.md` file, even if thousands of identical files (templates) are clustered in a narrow size range (e.g., 2KB).
