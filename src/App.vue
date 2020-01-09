<template>
  <div id="app">
    <h1>Meetup Search Plus</h1>
    <MeetupList />
  </div>
</template>

<script>
import MeetupList from "./components/MeetupList.vue";

export default {
  name: "app",
  components: {
    MeetupList
  }
};
</script>

<style>
#app {
  color: #2c3e50;
  max-width: 900px;
  margin: 0 auto;
}

</style>
