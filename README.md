# Meeting Notes Summariser

A modern, responsive Next.js application that processes meeting transcripts and answers user queries using the Google Gemini AI. It extracts decisions, action items, and discussions, providing direct quotes from the transcript as references.

## Features
- **In-Memory Transcript Processing**: Upload a `.txt` file or paste your meeting transcript directly.
- **Conversational AI Interface**: Ask specific questions about the meeting and get structured answers.
- **Quote References**: The AI is instructed to provide exact quotes from the transcript to back up its statements.
- **Premium UI**: Designed with a sleek glassmorphism aesthetic using vanilla CSS (no Tailwind required).

## Architecture
- **Frontend**: Next.js App Router (React)
- **Styling**: Vanilla CSS Modules with custom variables for dynamic theming.
- **Backend API**: Next.js Route Handlers (`/api/chat`)
- **AI Integration**: `@google/genai` SDK using the Gemini 2.5 Flash model.

## Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A Google Gemini API Key. Get one from Google AI Studio.

## Setup Instructions

1. **Clone the repository** (if applicable) or navigate to the project directory:
   ```bash
   cd meeting-notes-summariser
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Environment Variables**:
   Create a `.env` file in the root directory and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```

5. **Open the Application**:
   Navigate to `http://localhost:3000` in your web browser.

## Usage
1. On the left panel, upload a `.txt` file containing your meeting notes, or paste the text directly into the text area.
2. In the right panel (chat area), type a question like:
   - *"What were the key decisions made?"*
   - *"List all action items and who is responsible."*
   - *"What did they say about the Q3 budget?"*
3. The AI will respond with structured answers and quotes extracted from your transcript.

## Testing
Basic validation can be performed using Node's native test runner (if configured) or by manually running the dev server and submitting queries.
