<template>
    <div class="appFooter">{{ t('footer.copyright') }}</div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>

<style lang="scss" scoped>
.appFooter{
    background-image: url('@/assets/images/app-bottom.png');
    background-size: cover;
    background-position: center;
    height: 40px;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
    font-size: 14px;
}

</style>