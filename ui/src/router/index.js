import Vue from 'vue'
import VueRouter from 'vue-router'
import ServerDash from '../views/ServerDash.vue'
import ServerPage from '../views/ServerPage.vue'

Vue.use(VueRouter)

  const routes = [
  {
    path: '/server/:server',
    name: 'RenderPage',
    component: ServerPage
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import(/* webpackChunkName: 'login' */'../views/Login.vue')
  },
  {
    path: '*',
    name: 'ServerDash',
    component: ServerDash
  },
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
  linkActiveClass: "is-active"
})

export default router
