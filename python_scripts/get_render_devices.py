import bpy

prefs = bpy.context.user_preferences.addons['cycles'].preferences
devices = prefs.devices
print(prefs.compute_device_type)

for d in devices:
    print(d.name)

