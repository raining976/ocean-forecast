<template>
  <div class="app-container container is-flex is-flex-direction-column" style="min-height:100vh;">
    <b-navbar >
      <template #brand>
        <b-navbar-item>
          导航栏
        </b-navbar-item>
         <b-navbar-item>
          导航栏
        </b-navbar-item>
         <b-navbar-item>
          导航栏
        </b-navbar-item>
      </template>
    </b-navbar>

    <main style="flex:1; width:100%;">
      <router-view />
    </main>

    <b-footer>
      <div class="content has-text-centered">底部栏</div>
    </b-footer>
  </div>
</template>

<style scoped>
.app-container{
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
</style>
