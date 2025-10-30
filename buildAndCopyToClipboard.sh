#!/bin/zsh

npm run build
pbcopy < ./dist/bot.iife.js
