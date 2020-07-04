<template>
  <div>
    <!-- <b-navbar>
        <template slot="brand">
            <b-navbar-item tag="router-link" to="/">
                <h4 class="title is-4">Blender Render UI</h4>
            </b-navbar-item>
        </template>
        <template slot="start">
            <b-navbar-item tag="router-link" to="/">
                Servers Dashboard
            </b-navbar-item>
        </template>

        <template slot="end">
            <b-navbar-item v-if="user">
               {{user.username}}
            </b-navbar-item>
        </template>
    </b-navbar> -->
    <router-view @login="processLogin" />
  </div>
</template>

<script>
export default {
  data() {
    return {
      user: null,
    }
  },
  methods: {
    processLogin(user) {
      this.user = user;
    }
  },
  created() {
    
  }
}
</script>