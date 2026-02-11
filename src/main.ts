import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { CanvasManager } from './engine/CanvasManager';
import { GameEngine } from './engine/GameEngine';

// Register PWA Service Worker
registerSW({
  onNeedRefresh() {
    if (confirm('新内容可用！是否刷新？')) {
      location.reload();
    }
  },
  onOfflineReady() {
    console.log('游戏已准备好离线玩！');
  },
});

console.log('1942 Retro Strike Initializing Engine...');

const canvasManager = new CanvasManager('gameCanvas');
const engine = new GameEngine(canvasManager.getContext());

engine.start();
