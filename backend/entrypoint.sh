#!/bin/sh

echo "🚀 启动姜窖管理系统后端服务..."

DB_PATH="/app/data/jiangjiao.db"

if [ ! -f "$DB_PATH" ]; then
    echo "📦 首次启动，正在初始化种子数据..."
    node dist/seed.js
    echo "✅ 种子数据初始化完成"
else
    echo "📊 数据库已存在，跳过初始化"
fi

echo "🌐 启动后端服务..."
exec node dist/index.js
