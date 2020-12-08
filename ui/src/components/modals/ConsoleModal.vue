<template>
    <div class="box">
        <VirtualList                    
            style="height: 200px; overflow-y: auto;"
            :data-key="'timestamp'"
            :data-sources="render.logs"
            :keeps="12"
            ref="renderlog"
            :data-component="$options.ListComponent"
        />
    </div>
</template>

<script>
export default {
    
}
</script>