<template>
  <div class="home">
    <h1>洛克王国孵蛋工具 <span class="author">薯多芬上校</span></h1>
    <p>请从左侧选择功能。</p>

    <div class="social-links">
      <!-- B站 -->
      <a
        class="social-btn bili-btn"
        href="https://www.bilibili.com/video/BV1mBJd6pEmt/?spm_id_from=333.1387.homepage.video_card.click"
        target="_blank"
        rel="noopener noreferrer"
        title="哔哩哔哩"
      >
        <svg viewBox="0 0 48 48" class="social-logo" aria-hidden="true">
          <path fill="#fff" d="M12 16h24a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V20a4 4 0 0 1 4-4z"/>
          <path fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" d="M16 16 12 10M32 16l4-6"/>
          <circle cx="18" cy="26" r="3" fill="#fb7299"/>
          <circle cx="30" cy="26" r="3" fill="#fb7299"/>
        </svg>
      </a>

      <!-- 抖音 -->
      <a
        class="social-btn douyin-btn"
        href="https://www.douyin.com/user/self?from_tab_name=main&modal_id=7698475945455291675"
        target="_blank"
        rel="noopener noreferrer"
        title="抖音"
      >
        <svg viewBox="0 0 24 24" class="social-logo" aria-hidden="true">
          <path fill="#fff" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z"/>
        </svg>
      </a>
    </div>

    <p class="home-note">点击转跳教学视频</p>
  </div>
</template>

<script setup>
</script>

<style scoped>
.home { max-width: 1100px; margin: 0 auto; color: #fff; }
h1 { margin-bottom: 12px; text-shadow: 0 2px 8px rgba(0,0,0,.2); }
h1 .author { font-size: .55em; font-weight: 400; color: rgba(255,255,255,.6); margin-left: 12px; vertical-align: middle; }
.home p { color: rgba(255,255,255,.7); }

/* 图标按钮容器 */
.social-links {
  display: flex;
  gap: 16px;
  margin-top: 24px;
}

.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  transition: transform .2s;
}
.social-btn:hover { transform: scale(1.08); }

.social-logo { width: 40px; height: 40px; }

/* B站 */
.bili-btn {
  background: #fb7299;
  box-shadow: 0 8px 20px rgba(251,114,153,.5);
}

/* 抖音 */
.douyin-btn {
  background: #000;
  box-shadow: 0 8px 20px rgba(0,0,0,.45);
}
.douyin-btn:hover {
  /* 抖音标志性的青色/红色微光 */
  box-shadow: 0 8px 20px rgba(0,0,0,.45), -3px 0 12px rgba(37,244,238,.35), 3px 0 12px rgba(254,44,85,.35);
}

.home-note { margin-top: 12px; font-size: 12px; color: rgba(255,255,255,.5); }
</style>