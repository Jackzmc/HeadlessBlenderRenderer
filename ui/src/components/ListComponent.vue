<template>
  <div :class="classname">{{source.timestamp | timestamp}} {{ source.text }}</div>
</template>

<script>
export default {
    name: 'item-component',
    props: {
        index: { // index of current item
            type: Number
        },
        source: { // here is: {uid: 'unique_1', text: 'abc'}
            type: Object,
            default () {
                return {}
            }
        },
    },
    computed:{
        classname() {
            const text = this.source.text.toLowerCase();
            if(text.includes("warn")) {
                return 'warning'
            } else if(text.includes("error")) {
                return 'has-text-danger'
            } else if(text.includes("Saved: ")) {
                return "has-text-success"
            } else{
                return ""
            }
        }
    },
    filters: {
        timestamp(inp) {
            const date = new Date(inp)
            return `[${date.toLocaleDateString()}] [${date.toLocaleTimeString()}]`
        }
    }
}
</script>

<style scoped>
.warning {
    color: rgb(187, 151, 8) 
}
</style>