<template>
    <div class="notice-container">
        <div class="content">
            <vue-fontawesome icon="desktop" size="4x" class="icon" />
            <h3>{{ t('common.notice.desktopOnlyTitle') }}</h3>
            <p>{{ t('common.notice.desktopOnlyDesc') }}</p>
        </div>
    </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<style scoped lang="scss">
.notice-container {
    display: none;
    height: 100%;
    width: 90%;
    margin: 0 auto;
    justify-content: center;
    align-items: center;
    background-color: rgba(255, 255, 255, 0.9);
    padding: 20px;
    text-align: center;
    border-radius: 10px;

    .content {
        display: flex;
        flex-direction: column;
        align-items: center;
        color: #2c3e50;

        .icon {
            margin-bottom: 20px;
            color: #0f1c2e;
        }

        h3 {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
        }

        p {
            font-size: 16px;
            line-height: 1.5;
            color: #666;
        }
    }
}

@media screen and (max-width: 768px) {
    .notice-container {
        display: flex;
        min-height: 400px;
    }
}
</style>
