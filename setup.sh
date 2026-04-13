#!/bin/bash
# CHMSU Lost and Found - Setup Script
# This script helps set up the project for local development

echo "=============================================="
echo "CHMSU Lost and Found System - Setup"
echo "=============================================="
echo ""

# Check if config.js exists
if [ -f "config.js" ]; then
    echo "✓ config.js already exists"
else
    echo "Creating config.js from template..."
    cp config.js.template config.js
    echo "✓ config.js created"
    echo "⚠ Please edit config.js with your Supabase credentials"
fi

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit config.js with your Supabase URL and Anon Key"
echo "2. Run a local server: python -m http.server 8000"
echo "3. Open http://localhost:8000 in your browser"
echo ""
echo "For GitHub Pages deployment:"
echo "1. Push to GitHub"
echo "2. Add SUPABASE_URL and SUPABASE_ANON_KEY as repository secrets"
echo "3. Enable GitHub Pages in repository settings"
echo ""
