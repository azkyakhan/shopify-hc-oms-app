import { createStore, useStore as useVuexStore } from "vuex"
import mutations  from './mutations'
import getters  from './getters'
import actions from './actions'
import RootState from './RootState'
import userModule from "./modules/user"


// TODO check how to register it from the components only
// Handle same module registering multiple time on page refresh
//store.registerModule('user', userModule);


const state: any = {

}

// Added modules here so that hydration takes place before routing
const store = createStore<RootState>({
    state,
    actions,
    mutations,
    getters,
    modules: {
        'user': userModule
    },
})

export default store
export function useStore(): typeof store {
    return useVuexStore()
}