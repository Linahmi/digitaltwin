# Digital Health Twin - Priority 1 MVP

Voice-enabled AI health assistant with patient context and evidence-based responses.

## 🎯 What's Built (Priority 1)

✅ **Voice Interface** - Web Speech API for input, browser TTS for output  
✅ **Claude Integration** - Patient context injected into every conversation  
✅ **Patient Data** - Loaded from Synthea-style JSON  
✅ **Chat UI** - Message bubbles with user/assistant distinction  

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment
```bash
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY from console.anthropic.com
```

### 3. Run dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Test the voice interface

The app will redirect to `/voice`. 

**Try asking:**
- "What's my risk of heart disease?"
- "Why is my blood pressure high?"
- "What should I do to lower my cholesterol?"

## 📁 Project Structure

```
digital-twin/
├── app/
│   ├── api/chat/          # Claude API integration
│   ├── voice/             # Main voice interface page
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── VoiceInterface.tsx # Mic button + speech recognition
│   └── MessageBubble.tsx  # Chat message display
├── types/
│   └── patient.ts         # TypeScript interfaces
└── public/patients/
    └── patient-001.json   # Sample patient data
```

## 🎤 Voice Interface Notes

- **Chrome/Edge required** - Web Speech API works best in Chromium browsers
- **HTTPS in production** - Speech API requires secure context
- Click the mic button to start listening
- Twin will speak responses automatically via browser TTS

## 🔧 Tech Stack

- **Next.js 15** - App Router
- **TypeScript**
- **Tailwind CSS**
- **Claude API** - @anthropic-ai/sdk
- **Web Speech API** - Voice input
- **Speech Synthesis API** - Voice output

## ⏭️ Next Steps (Priority 2)

After Priority 1 works:
- Add PubMed citations to responses
- Build profile dashboard
- Implement Framingham CVD risk calculator
- Add what-if simulation UI

## 🐛 Troubleshooting

**Voice not working?**
- Check browser console for errors
- Ensure microphone permissions granted
- Try Chrome/Edge (Firefox has limited support)

**API errors?**
- Verify ANTHROPIC_API_KEY in .env.local
- Check API key permissions at console.anthropic.com
- Look for error messages in terminal

**Patient data not loading?**
- Check browser console network tab
- Verify patient-001.json exists in public/patients/
