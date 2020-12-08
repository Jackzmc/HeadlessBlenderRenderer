<template>
<div class="modal-card" style="width: auto; font-size: 20px">
    <header class="modal-card-head">
        <p class="modal-card-title">Your Permissions</p>
        <button
            type="button"
            class="delete"
            @click="$emit('close')"/>
    </header>
    <section class="modal-card-body">
        <ul>
            <li v-for="(flag,index) in $options.flags" :key="index">
                <b-icon 
                    :icon="hasPermission(index) ? 'check' : 'close'" 
                    :type="hasPermission(index) ? 'is-success' : 'is-danger'" 
                    size="is-small"
                />&nbsp;
                <span v-if="hasPermission(index)"><b>{{index+1}}. {{flag.description}}</b></span>
                <span v-else> {{index+1}}. {{flag.description}}</span>
            </li>
        </ul>
        <hr>
        <p><strong>Permission Number: </strong>{{permissions}}</p>
    </section>
</div>
</template>

<script>
import {flags} from '../../data.json'
export default {
    props: ['permissions', 'bits'],
    flags,
    methods: {
        hasPermission(index) {
            return this.bits.includes(1 << index)
        },
    }
}
</script>