<template>
  <ion-page>
    <ion-content>
      <!-- Commented form tag as when using it the install page reloads again and
      then redirect to shopify -->
      <!-- <form> -->
        <ion-list>
          <img src="../assets/images/hc.png" />
          <ion-item>
            <ion-label position="floating">Shop</ion-label>
            <ion-input
              v-model="shopOrigin"
              name="shopOrigin"
              type="text"
              required
            ></ion-input>
          </ion-item>
        </ion-list>
        <div class="ion-padding">
          <ion-button type="submit" expand="block" @click="install(shopOrigin)">
            Install
          </ion-button>
        </div>
      <!-- </form> -->
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
} from "@ionic/vue";
import { defineComponent } from "vue";
import { Redirect } from "@shopify/app-bridge/actions";
import createApp from "@shopify/app-bridge";
import { showToast } from "@/utils";
import { useRouter } from "vue-router";
import emitter from "@/event-bus"
import { generateAccessToken, getApiKey } from "@/services"
import { getSessionToken } from "@shopify/app-bridge-utils";
import { useStore } from "vuex";


export default defineComponent({
  name: "Install",
  components: {
    IonButton,
    IonContent,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonPage,
  },
  data() {
    return {
      apiKey: process.env.VUE_APP_SHOPIFY_API_KEY,
      shopOrigin: 'hc-sandbox.myshopify.com',
      session: this.$route.query['session'],
      hmac: this.$route.query['hmac'],
      shop: this.$route.query['shopOrigin'],
      host: this.$route.query['host'] as string,
      locale: this.$route.query['locale'] || process.env.VUE_APP_I18N_LOCALE || process.env.VUE_APP_I18N_FALLBACK_LOCALE,
      timestamp: this.$route.query['timestamp'],
      code: this.$route.query['code']
    };
  },
  async mounted () {
    const shop: string = this.shop as string || this.shopOrigin
    this.store.dispatch('shop/setShop', {
        "shop": shop
      })
    if (this.session) {
      const apiKey = await this.getApiKey(shop);
      const app = createApp({
        apiKey,
        host: this.host,
      });
      const sessionToken = await getSessionToken(app);
      this.store.dispatch('shop/setShopToken', {
          "token": sessionToken
        })

      const resp = await this.store.dispatch('shop/getConfiguration', {
        "session": sessionToken,
        "clientId": apiKey,
        "shop": shop
      })
      if (resp.status) {
        this.$router.push("/configure");
      }
    } else if (this.code) {
      const apiKey = await this.getApiKey(shop);
      const status = await generateAccessToken({
        "code": this.code,
        "shop": shop,
        "clientId": apiKey,
        "host": this.host,
        "hmac": this.hmac,
        "timestamp": this.timestamp
      }).then(resp => resp.json()).then(data => data.status).catch(err => console.warn(err));
      // TODO: Add error message to the UI when status is false or there is some error in the resp
      if (status) {
        const appURL = `https://${shop}/admin/apps/${this.apiKey}`;
        window.location.assign(appURL);
      }
    } else if (this.shop || this.host) {
      this.authorise(shop, this.host);
    }
  },
  methods: {
    install(shopOrigin: any) {
      this.authorise(shopOrigin, undefined);
    },
    async authorise(shop: any, host: any) {
      emitter.emit("presentLoader");
      const redirectUri = process.env.VUE_APP_SHOPIFY_REDIRECT_URI;
      const scopes = process.env.VUE_APP_SHOPIFY_SCOPES;
      const apiKey = await this.getApiKey(shop);
      const permissionUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${redirectUri}`;
      if (window.top == window.self) {
        window.location.assign(permissionUrl);
      } else {
        const app = createApp({
          apiKey,
          host,
        });
        Redirect.create(app).dispatch(Redirect.Action.REMOTE, permissionUrl);
      }
      emitter.emit("dismissLoader");
    },
    async getApiKey(shop: string) {
      let apiKey = this.apiKey;
      if (!apiKey) {
        // TODO update as per the API. API key will be setup in environment for the public app only
        // We will get the apiKey for custom apps, when unavailable
        apiKey = await getApiKey({
          "shop": shop,
          "appType": process.env.VUE_APP_SHOPIFY_APP_TYPE
        });

      }
      return apiKey;

    }
  },
  beforeUnmount () {
    emitter.emit("dismissLoader")
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    return {
      router,
      store,
      showToast,
    };
  },
});
</script>

<style scoped></style>
