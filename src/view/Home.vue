<template>
  <div class="home">
    <h1>Home</h1>
    <p>{{ message }}</p>
  </div>
</template>

<script setup>
import { useTestStore } from '../store'
const store = useTestStore()
const message = store.message
</script>

<style scoped>
.home{
  margin: 0 auto;
}
</style>
