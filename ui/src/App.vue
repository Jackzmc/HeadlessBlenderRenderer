<template>
  <div>
    <b-navbar>
        <template slot="brand">
            <b-navbar-item tag="router-link" to="/">
                <h4 class="title is-4">Blender Render UI</h4>
            </b-navbar-item>
        </template>
        <template slot="start">
            <b-navbar-item tag="router-link" to="/">
                Servers Dashboard
            </b-navbar-item>
            <b-navbar-item tag="router-link" to="/server/local">
                Local Server
            </b-navbar-item>
        </template>

        <template slot="end">
            <b-navbar-item tag="div">
                <router-link to="/login" class="button is-light">
                    Login
                </router-link>
            </b-navbar-item>
        </template>
    </b-navbar>
    <router-view/>
  </div>
</template>
