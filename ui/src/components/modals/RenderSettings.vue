<template>
<div class="box">
    <h3 class='title is-3'>Render Settings <b-button class="is-pulled-right" icon-left="close" @click="save" /></h3>
    <hr>
    <b-field label="Render Quality">
        <b-input style="width:20%"
            v-model="options.render_quality"
            type="number" 
        />
        
    </b-field>
    <b-field label="Render Quality">
        <b-slider v-model="options.render_quality" :custom-formatter="val => val + '%'" :min="0" :max="300" :step="5">
            <b-slider-tick :value="25">25%</b-slider-tick>
            <b-slider-tick :value="50">50%</b-slider-tick>
            <b-slider-tick :value="75">75%</b-slider-tick>
            <b-slider-tick :value="100">100%</b-slider-tick>
            <b-slider-tick :value="125">125%</b-slider-tick>
            <b-slider-tick :value="150">150%</b-slider-tick>
            <b-slider-tick :value="175">175%</b-slider-tick>
            <b-slider-tick :value="200">200%</b-slider-tick>
        </b-slider>
    </b-field>
    <b-field label="Python Scripts (Optional)">
        <b-taginput :disabled="render.active"
            v-model="options.python_scripts"
            placeholder="Comma-separated list of filenames"
            type="is-dark">
        </b-taginput>
    </b-field>
    <b-field label="Extra Command Arguments (Optional)" v-if="serverSettings.extraShellArgs">
        <b-input
        v-model="options.extra_arguments" 
        disabled 
        />
    </b-field>
</div>
</template>

<script>
export default {
    props: ['settings', 'serverSettings', 'render'],
    data() {
        return {
            options: this.settings
        }
    },
    methods: {
        save() {
            this.$emit('save', this.options)
            this.$parent.close()
        }
    },
    created() {
        this.temperature = this.default.use_celsius ? 'celsius' : 'fahrenheit';
        this.socket_enabled = this.default.socket_enabled
    }
}
</script>