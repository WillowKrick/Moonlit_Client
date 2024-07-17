import './assets/main.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import piniaPersist from 'pinia-plugin-persistedstate'
import App from './App.vue'
import 'ant-design-vue/dist/reset.css'
import router from './router'

const app = createApp(App)

app.use(Antd)

app.use(createPinia().use(piniaPersist))

app.use(router)

app.mount('#app')
