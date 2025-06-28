# openCLI

**Open-source AI CLI powered by Qwen3-30B-A3B via LM Studio**

A fork of Google's Gemini CLI, modified to work with local AI models through LM Studio's OpenAI-compatible API.

## 🚀 Features

- **Local AI Power**: Runs completely offline with your local Qwen3-30B-A3B model
- **No API Costs**: Free unlimited usage with your local setup
- **Privacy First**: All conversations stay on your machine
- **Thinking Mode**: Leverages Qwen3's advanced reasoning capabilities
- **Full Tool Integration**: File operations, shell commands, code editing, and more
- **Backward Compatible**: Still supports Gemini API if needed

## 📋 Prerequisites

1. **LM Studio** installed and running
2. **Qwen3-30B-A3B model** loaded in LM Studio
3. **Node.js 18+** for running openCLI

## 🛠️ Installation & Setup

### Option 1: Global Installation (Recommended)
```bash
# Clone the repository
git clone https://github.com/geekyabhijit/openCLI.git
cd openCLI

# Install dependencies and build
npm install
npm run build

# Install globally to use 'opencli' command anywhere
npm install -g .

# Now you can use openCLI from any directory
opencli "Hello, introduce yourself"
```

### Option 2: Local Usage
```bash
# Clone and build
git clone https://github.com/geekyabhijit/openCLI.git
cd openCLI
npm install
npm run build

# Run directly from project directory
node bundle/opencli.js "Hello, introduce yourself"
```

### 1. Install LM Studio
Download from [https://lmstudio.ai/](https://lmstudio.ai/)

### 2. Load Qwen3-30B-A3B Model
In LM Studio:
- Go to the "Discover" tab
- Search for "qwen3-30b-a3b"
- Download and load the model
- Start the local server (default: http://127.0.0.1:1234)

### 3. Run openCLI
```bash
# After global installation, use from anywhere:
opencli "create a simple web page"

# Or with specific options:
opencli --yolo "build a snake game in html"

# Interactive mode
opencli
```

## 🎯 Usage Examples

### Basic Usage
```bash
# Ask a question
echo "How do I set up a Node.js project?" | node bundle/opencli.js

# Get help with code
echo "Explain this TypeScript interface" | node bundle/opencli.js

# File operations
echo "List all TypeScript files in this directory" | node bundle/opencli.js
```

### Configuration Options
```bash
# Use different local endpoint
node bundle/opencli.js --local-endpoint http://localhost:8080

# Enable debug mode
node bundle/opencli.js --debug

# Include all files in context
node bundle/opencli.js --all_files

# YOLO mode (auto-accept all actions)
node bundle/opencli.js --yolo
```

### Advanced Features
```bash
# With custom model
node bundle/opencli.js --model "your-custom-model"

# Enable thinking mode visualization
node bundle/opencli.js --debug

# Show memory usage
node bundle/opencli.js --show_memory_usage
```

## ⚙️ Configuration

### Environment Variables
```bash
# Set default local model
export LOCAL_MODEL="qwen3-30b-a3b"

# Set default endpoint
export LOCAL_MODEL_ENDPOINT="http://127.0.0.1:1234"

# Enable debug mode
export DEBUG=1
```

### LM Studio Configuration
Make sure LM Studio is configured with:
- **Port**: 1234 (default)
- **CORS**: Enabled
- **API**: OpenAI Compatible
- **Model**: Qwen3-30B-A3B loaded and selected

## 🔧 Troubleshooting

### "Cannot connect to local model"
1. Check if LM Studio is running
2. Verify the model is loaded
3. Confirm the endpoint URL is correct
4. Check if port 1234 is accessible

### "API Error" in responses
- Usually harmless - the core functionality works
- Can be improved in future versions
- Doesn't affect the AI's ability to help

### Model not responding
1. Restart LM Studio
2. Reload the Qwen3-30B-A3B model
3. Check LM Studio logs for errors
4. Try a different model if available

## 🆚 Comparison with Original Gemini CLI

| Feature | Gemini CLI | openCLI |
|---------|------------|---------|
| **Cost** | Requires API credits | Free |
| **Privacy** | Cloud-based | Local-only |
| **Speed** | Network dependent | Local speed |
| **Model** | Gemini 2.5 Pro | Qwen3-30B-A3B |
| **Thinking** | Yes | Yes |
| **Tools** | Full support | Full support |
| **Offline** | No | Yes |

## 🛣️ Roadmap

- [ ] Improve response streaming
- [ ] Add more local model support
- [ ] Better error handling
- [ ] Performance optimizations
- [ ] UI improvements
- [ ] Docker containerization
- [ ] Multiple model switching

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Test with local models
5. Submit a pull request

## 📄 License

Apache 2.0 License - see LICENSE file for details.

## 🙏 Acknowledgments

- Original Gemini CLI team at Google
- LM Studio for the excellent local AI platform
- Qwen team for the amazing Qwen3 models
- Open source community for inspiration

---

**Made with ❤️ for the local AI community**
