# Project Setup Guide

This project uses **efficient text-based chunking** to search meeting transcripts.

## System Requirements

- **Node.js**: v18 or higher
- **npm** or **yarn**: Latest version
- **Python**: v3.8+ (optional, for development)
- **Git**: For version control

## Quick Setup (2 minutes)

### Step 1: Clone/Navigate to Project
```bash
cd meeting-notes-summariser
```

### Step 2: Install Node.js Dependencies
```bash
npm install
```

### Step 3: Create Environment File
```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local and add your Gemini API Key
# GEMINI_API_KEY=your-actual-api-key-here
```

Get your API key from: https://aistudio.google.com/apikey

### Step 4: Run the Application
```bash
npm run dev
```

Access the app at: http://localhost:3000

### Step 5: View Your Database
```bash
# View database information and contents
node scripts/view-db.js

# Or export full database as JSON
node scripts/view-db.js export
```

Database stored at: `.chroma_db/database.json` (created automatically)

---

## Detailed Setup Instructions

### For Windows Systems

#### 1. Install Prerequisites
```powershell
# Using winget (Windows Package Manager)
winget install -e --id OpenJS.NodeJS

# Or download manually from: https://nodejs.org/
```

#### 2. Clone/Navigate to Project
```powershell
cd C:\Your\Project\Path\meeting-notes-summariser
```

#### 3. Install Node Dependencies
```powershell
npm install
```

#### 4. Setup Environment
```powershell
# Create .env.local from template
Copy-Item .env.example .env.local

# Edit with your editor (e.g., Notepad or VS Code)
notepad .env.local
```

Add your Gemini API Key:
```
GEMINI_API_KEY=your-actual-api-key-here
```

#### 5. Run Dev Server
```powershell
npm run dev
```

#### 6. View Database
```powershell
# See what's in your local database
node scripts/view-db.js
```

#### 7. Access the Application
- App: http://localhost:3000
- Database file: `.chroma_db/database.json`

---

### For macOS Systems

#### 1. Install Prerequisites
```bash
# Using Homebrew
brew install node

# Or download from: https://nodejs.org/
```

#### 2. Clone/Navigate to Project
```bash
cd ~/Projects/meeting-notes-summariser
```

#### 3. Install Node Dependencies
```bash
npm install
```

#### 4. Setup Environment
```bash
cp .env.example .env.local
open .env.local  # Opens in default editor
```

Add your Gemini API Key:
```
GEMINI_API_KEY=your-actual-api-key-here
```

#### 5. Run Dev Server
```bash
npm run dev
```

#### 6. View Database
```bash
# See what's in your local database
node scripts/view-db.js
```

#### 7. Access the Application
- App: http://localhost:3000
- Database file: `.chroma_db/database.json`

---

### For Linux Systems

#### 1. Install Prerequisites
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y nodejs npm

# Fedora/RHEL
sudo dnf install -y nodejs npm
```

#### 2. Clone/Navigate to Project
```bash
cd ~/projects/meeting-notes-summariser
```

#### 3. Install Node Dependencies
```bash
npm install
```

#### 4. Setup Environment
```bash
cp .env.example .env.local
nano .env.local  # or use your preferred editor
```

Add your Gemini API Key:
```
GEMINI_API_KEY=your-actual-api-key-here
```

#### 5. Run Dev Server
```bash
npm run dev
```

#### 6. View Database
```bash
# See what's in your local database
node scripts/view-db.js
```

#### 7. Access the Application
- App: http://localhost:3000
- Database file: `.chroma_db/database.json`

---

## Optional: Python Virtual Environment Setup

If you want to develop Python components separately:

### Windows
```powershell
# Create virtual environment
python -m venv venv

# Activate it
.\venv\Scripts\Activate.ps1

# Install Python dependencies
pip install -r requirements.txt

# Deactivate when done
deactivate
```

### macOS/Linux
```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Deactivate when done
deactivate
```

---

## Database Management

### View Database Contents
```bash
# View database summary
node scripts/view-db.js

# Export full database as JSON
node scripts/view-db.js export > db_backup.json
```

### Database Location
```
.chroma_db/
└── database.json          # Your vector database (created automatically)
```

### Backup Database
```bash
# Create a backup
cp .chroma_db/database.json ./backups/database_$(date +%Y%m%d_%H%M%S).json

# Or zip it
tar -czf chroma_db_backup.tar.gz .chroma_db/
```

### Clear/Reset Database
```bash
# Delete the database folder (all transcripts will be lost)
rm -rf .chroma_db

# The app will create a new database when you upload a new transcript
```

---

## Troubleshooting

### Port Already in Use
```bash
# If port 3000 is in use
lsof -i :3000          # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Use a different port
PORT=3001 npm run dev
```

### Missing API Key
```bash
# Make sure .env.local exists and has GEMINI_API_KEY
cat .env.local  # macOS/Linux
type .env.local  # Windows

# If missing, copy and edit again
cp .env.example .env.local
```

### Node Modules Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Database Corruption
```bash
# If database seems corrupted, back it up and recreate
cp -r .chroma_db .chroma_db.backup
rm -rf .chroma_db
npm run dev
```

---

## Running on Another System

### Transfer Project to Another Computer

#### 1. Clone from Git (Recommended)
```bash
git clone <your-repo-url>
cd meeting-notes-summariser
```

#### 2. Or Copy Files
```bash
# Copy without node_modules and .chroma_db
rsync -av --exclude=node_modules --exclude=.chroma_db --exclude=venv <source> <destination>
```

#### 3. Setup on New System
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Add your API key to .env.local

# Run app
npm run dev

# View database (will be empty initially)
node scripts/view-db.js
```

**Note**: The `.chroma_db/` folder is **not** transferred by default, so the database starts fresh on the new system. To transfer your database:

```bash
# Copy the database manually
cp -r .chroma_db <destination>/
```

---

## Project Structure

```
meeting-notes-summariser/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts        # Main API endpoint
│   │   ├── page.tsx                # Main app component
│   │   └── layout.tsx
│   └── utils/
│       ├── embedding.ts            # Embedding generation
│       ├── vectorStore.ts          # Local ChromaDB integration
│       └── parser.ts               # Text parsing
├── scripts/
│   └── view-db.js                  # Database inspection tool
├── public/                         # Static files
├── .chroma_db/                     # Local vector database (created automatically)
│   └── database.json               # All your indexed transcripts
├── package.json                    # Node.js dependencies
├── .env.example                    # Environment template
├── .env.local                      # Your environment (not in git)
└── README.md                       # Usage instructions
```

---

## Next Steps

1. ✅ Get your Gemini API key from https://aistudio.google.com/apikey
2. ✅ Follow the Quick Setup steps above
3. ✅ Upload a meeting transcript
4. ✅ Ask questions about your meeting
5. ✅ Check your database with `node scripts/view-db.js`

---

## Support & Resources

- **Gemini API**: https://ai.google.dev/
- **ChromaDB**: https://www.trychroma.com/
- **Next.js**: https://nextjs.org/
- **LangChain**: https://python.langchain.com/

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Your Google Gemini API key |
| `NODE_ENV` | No | development, production, test |
| `PORT` | No | Server port (default: 3000) |
