#!/bin/bash

# Claude Code Parallel Execution Setup Script
# Usage: ./claude-parallel-setup.sh [session-name]

SESSION_NAME=${1:-"claude-parallel"}

echo "🚀 Setting up Claude Code parallel execution environment..."

# Set alias for Claude Code
echo "Setting up alias..."
alias cc="claude --dangerously-skip-permissions"

# Create new tmux session or attach if exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "📺 Session '$SESSION_NAME' already exists. Attaching..."
    tmux attach-session -t "$SESSION_NAME"
    exit 0
fi

echo "📺 Creating new tmux session: $SESSION_NAME"
tmux new-session -d -s "$SESSION_NAME" -c "$(pwd)"

# Create 4-pane layout: left main, right 3 workers  
echo "🔧 Creating 4-pane layout (left: main, right: 3 workers)..."
tmux split-window -h -t "$SESSION_NAME"
tmux split-window -v -t "$SESSION_NAME:0.1"
tmux split-window -v -t "$SESSION_NAME:0.2"

# Get pane IDs
echo "📋 Getting pane IDs..."
PANE_IDS=($(tmux list-panes -t "$SESSION_NAME" -F "#{pane_id}"))

echo "Pane structure:"
tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}: #{pane_id}"

# Start Claude Code in all panes
echo "🤖 Starting Claude Code instances..."
for i in {0..3}; do
    if [ ${PANE_IDS[$i]} ]; then
        tmux send-keys -t "${PANE_IDS[$i]}" "claude --dangerously-skip-permissions" Enter
        if [ $i -eq 0 ]; then
            echo "Started Main Coordinator in pane $i (${PANE_IDS[$i]})"
        else
            echo "Started Worker $i in pane $i (${PANE_IDS[$i]})"
        fi
        sleep 0.5
    fi
done

# Display instructions
echo "
✅ 4-Pane Claude Code Setup Complete! 

📊 Layout & Role Assignment:
┌─────────────┬─────────────┐
│             │ Worker 1    │
│    Main     │ Frontend/UI │
│ Coordinator │ (${PANE_IDS[1]})       │
│   (${PANE_IDS[0]})      ├─────────────┤
│             │ Worker 2    │
│             │ Backend/API │
│             │ (${PANE_IDS[2]})       │
│             ├─────────────┤
│             │ Worker 3    │
│             │ Test/QA     │
│             │ (${PANE_IDS[3]})       │
└─────────────┴─────────────┘

🎯 Role Specialization:
- Main (${PANE_IDS[0]}): Project coordination, task management, integration
- Worker 1 (${PANE_IDS[1]}): Frontend/UI - Views, CSS, JavaScript, UX
- Worker 2 (${PANE_IDS[2]}): Backend/API - Controllers, DB, Business logic  
- Worker 3 (${PANE_IDS[3]}): Test/QA - Testing, debugging, documentation

🚀 Quick Commands:
- Attach: tmux attach-session -t $SESSION_NAME
- Task assignment: tmux send-keys -t PANE_ID \"task\" Enter
- Get status: tmux capture-pane -t PANE_ID -p | tail -10
- Clear worker: tmux send-keys -t PANE_ID \"/clear\" Enter

💡 See CLAUDE.md for detailed usage instructions.
"

# Attach to session
tmux attach-session -t "$SESSION_NAME"