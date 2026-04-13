#!/bin/bash
input=$(cat)

# PS1-style prompt: user@host:cwd (bold green user@host, bold blue cwd)
user=$(whoami)
host=$(hostname -s)
cwd=$(echo "$input" | jq -r '.cwd // empty')
[ -z "$cwd" ] && cwd=$(pwd)
printf "\033[01;32m%s@%s\033[00m:\033[01;34m%s\033[00m" "$user" "$host" "$cwd"

# Model
model=$(echo "$input" | jq -r '.model.id // empty')

# Token counts
total_input=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
total_output=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')
total_tokens=$((total_input + total_output))

# Session start time: derive from transcript file creation time
transcript=$(echo "$input" | jq -r '.transcript_path // empty')
if [ -n "$transcript" ] && [ -f "$transcript" ]; then
  start_epoch=$(stat -c "%Y" "$transcript" 2>/dev/null)
else
  start_epoch=""
fi

if [ -n "$start_epoch" ]; then
  session_start=$(date -u -d "@$start_epoch" "+%Y-%m-%dT%H:%M:%SZ")

  now_epoch=$(date +%s)
  elapsed_secs=$((now_epoch - start_epoch))
  elapsed_h=$((elapsed_secs / 3600))
  elapsed_m=$(( (elapsed_secs % 3600) / 60 ))
  elapsed_s=$((elapsed_secs % 60))
  elapsed=$(printf "%02d:%02d:%02d" "$elapsed_h" "$elapsed_m" "$elapsed_s")

  printf " | %sstarted:%s elapsed:%s | in:%s out:%s total:%s" \
    "${model:+$model | }" "$session_start" "$elapsed" "$total_input" "$total_output" "$total_tokens"
else
  printf " | %sin:%s out:%s total:%s" \
    "${model:+$model | }" "$total_input" "$total_output" "$total_tokens"
fi
