<template>
<div class="box">
    <h3 class='title is-3'>Settings</h3>
    <hr>
    <b-field label="Temperature">
        <b-checkbox v-model="use_celsius">
            Use Celsius
        </b-checkbox>
    </b-field>
    <b-field label="Socket" message="Socket is responsibile for showing logs, statistics, current frame information, and uploading files. Only disable to save bandwidth.">
        <b-checkbox v-model="socket_enabled">
            {{socket_enabled?"Enabled":"Disabled"}}
        </b-checkbox>
        
    </b-field>
    <hr>
    <b-button @click="save" type="is-success">
        <b-icon icon="content-save" />
        <span>Save Settings</span>
    </b-button>
</div>
</template>

<script>
export default {
    props: ['default'],
    data() {
        return {
            use_celsius: true,
            socket_enabled: true
        }
    },
    methods: {
        save() {
            const saveObject = {
                use_celsius: this.use_celsius,
                socket_enabled: this.socket_enabled
            }
            if(window.localStorage) {
                window.localStorage.setItem('blender_opts',JSON.stringify(saveObject))
                this.$buefy.toast.open({
                    type:'is-succes',
                    message:'Successfullly saved settings'
                })
            }else{
                this.$buefy.toast.open({
                    type:'is-warning',
                    message:'Browser does not support saving to LocalStorage'
                })
            }
            this.$emit('save', saveObject);
        }
    },
    created() {
        this.use_celsius = this.default.use_celsius;
        this.socket_enabled = this.default.socket_enabled
    }
}
</script>