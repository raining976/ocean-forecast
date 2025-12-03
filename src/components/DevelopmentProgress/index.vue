<template>
    <section class="dev-page">
        <div class="dev-card" role="status" aria-live="polite">
            <div class="dev-icon" v-html="iconSvg" aria-hidden="true"></div>
            <h2 class="dev-title">{{ displayTitle }}</h2>
            <p class="dev-desc">{{ displayDescription }}</p>

            <div class="dev-actions">
                <button class="btn primary" @click="goHome" type="button">{{ t('common.button.backHome') }}</button>
                <button class="btn" @click="reload" type="button">{{ t('common.button.refresh') }}</button>
                <a v-if="feedbackUrl" :href="feedbackUrl" target="_blank" rel="noopener" class="btn link">{{ t('common.button.feedback') }}</a>
            </div>

            <p class="dev-meta" v-if="meta">{{ meta }}</p>
        </div>
    </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
    title: { type: String, default: '' },
    description: {
        type: String,
        default: ''
    },
    feedbackUrl: { type: String, default: '' },
    meta: { type: String, default: '' }
})

const displayTitle = computed(() => props.title || t('dev.title'))
const displayDescription = computed(() => props.description || t('dev.description'))

const router = useRouter()

function goHome() {
    // 跳回首页，如项目使用不同路由，请调整为具体路由 name 或 path
    router.push({ path: '/' }).catch(() => {})
}

function reload() {
    window.location.reload()
}

// 简洁的施工/维护 SVG 图标（颜色继承）
const iconSvg = ref(`
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="7" width="20" height="11" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <path d="M9 7V5a3 3 0 1 1 6 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8 16v2m8-2v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </svg>
`)
</script>

<style scoped>
.dev-page {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 16px;
    min-height: calc(100vh - 80px);
    background: var(--page-bg, transparent);
    color: var(--text-color, #2c3a45);
}

.dev-card {
    width: 100%;
    max-width: 760px;
    text-align: center;
    background: var(--card-bg, #fff);
    border-radius: 12px;
    padding: 36px 28px;
    box-shadow: var(--card-shadow, 0 6px 18px rgba(25, 35, 50, 0.08));
    border: 1px solid var(--card-border, rgba(20, 30, 40, 0.04));
}

.dev-icon {
    width: 72px;
    height: 72px;
    margin: 0 auto 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary-color, #409eff);
}

.dev-title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--title-color, #12263f);
}

.dev-desc {
    margin: 10px 0 22px;
    color: var(--muted-color, #6b7785);
    font-size: 14px;
    line-height: 1.6;
}

.dev-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 14px;
}

.btn {
    -webkit-appearance: none;
    appearance: none;
    border: 1px solid var(--btn-border, rgba(18, 24, 32, 0.08));
    background: var(--btn-bg, transparent);
    color: var(--btn-color, var(--text-color, #2c3a45));
    padding: 8px 14px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
}

.btn.primary {
    background: var(--primary-color, #409eff);
    color: #fff;
    border-color: transparent;
    box-shadow: none;
}

.btn.link {
    background: transparent;
    color: var(--primary-color, #409eff);
    text-decoration: underline;
    border: none;
    padding: 6px 8px;
}

.btn:focus {
    outline: none;
    box-shadow: 0 0 0 4px rgba(64,158,255,0.12);
}

.dev-meta {
    margin: 0;
    font-size: 12px;
    color: var(--muted-color, #98a0a8);
}
@media (max-width: 520px) {
    .dev-card { padding: 24px 18px; }
    .dev-title { font-size: 18px; }
    .dev-icon { width: 60px; height: 60px; margin-bottom: 12px; }
}
</style>