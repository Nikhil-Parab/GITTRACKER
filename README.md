# GitTracker: AI-Powered Conflict Resolution for VS Code

GitTracker is a powerful VS Code extension that visualizes Git conflicts and uses advanced AI (Gemini/OpenAI) to suggest intelligent resolutions.

## Features

- 🌳 **Visual Conflict Tree**: See all conflicts organized by file and severity.
- 🤖 **AI-Powered Resolution**: Integrated AI analyzes code context to suggest optimal merges.
- ✨ **One-Click Apply**: Accept AI suggestions instantly with a single button.
- 📝 **Inline Diff View**: Compare branches side-by-side.
- 🔒 **Secure**: API keys are stored locally in `.env` or VS Code Settings.

## Requirements

- **VS Code**: Version 1.70.0 or higher.
- **Python**: Version 3.8 or higher.
- **Git**: Installed and available in PATH.

## Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/YourUsername/GitTracker.git
    cd GitTracker
    ```

2.  **Install Extension Dependencies**:
    ```bash
    npm install
    ```

3.  **Install Backend Dependencies**:
    Navigate to the `backend` folder and install Python requirements.
    ```bash
    cd backend
    pip install -r requirements.txt
    ```

## Configuration

### API Key Setup
To use the AI resolution features, you need to provide an API key for either Google Gemini (Free Tier available) or OpenAI.

**Option 1: .env File (Recommended for Local Dev)**
To keep your key secure and out of version control, create a `.env` file in the `backend/` directory:

```bash
# In backend/.env
GEMINI_API_KEY=your_actual_api_key_here
```

**Option 2: VS Code Settings**
You can also configure it in VS Code:
1.  Open Settings (`Ctrl+,`).
2.  Search for `GitTracker`.
3.  Enter your `Ai Api Key` and select your `Ai Provider`.

### Security Note
The `.env` file and `*.log` files are automatically ignored by Git (`.gitignore`) to prevent accidental leakage of sensitive information.

## Usage

1.  Open a folder containing a Git repository in VS Code.
2.  The **GitTracker** branch icon will appear in the Activity Bar (or Sidebar).
3.  Click the icon to see a tree view of detected conflicts.
4.  **Click on a conflict** to open the Conflict Resolution View.
5.  Click **"Suggest Resolution (AI)"**.
6.  Review the suggestion and click **"Apply Fix"** to automatically resolve the conflict.

## Running Locally (Development)

1.  Open the project in VS Code.
2.  Also ensure you have the `backend` dependencies installed (`pip install -r backend/requirements.txt`).
3.  Press **F5** to start the Extension Development Host.
4.  In the new window that opens, open a Git project with conflicts to test.

## Troubleshooting

- **404 Gemini Error**: This usually means the default model isn't available for your API key. GitTracker is smart enough to auto-detect available models (like `gemini-pro`, `gemini-1.5-flash`), so try restarting the extension/server if you see this.
- **Backend Connection Failed**: Ensure Python is installed and `pip install -r requirements.txt` was run successfully.

## License

[MIT](LICENSE)
