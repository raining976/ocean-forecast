<template>
  <div class="app-container">
    <AppNav />
    <div class="content">
      <router-view />
    </div>
    <AppFooter />
  </div>
</template>
<script setup>
</script>

<style scoped lang="scss">
.app-container {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: 100vh;

  &::after, &::before {
    content: "";
    position: absolute;
    width: 50px;
    height: 100%;
    background-size: cover;
    background-position: center;
    z-index: 1;
  }

  &::after{
    left: 0;
    background-image: url('@/assets/images/app-left.png');
  }

  &::before{
    right: 0;
    background-image: url('@/assets/images/app-right.png');
  }
  
  .content {
    flex: 1;
    width: 100%;
    margin: 0;
  }
}
</style>
