"""Dedicated Blender GUI process for this game's asset; does not load or overwrite another project."""
import bpy
import importlib.util
from pathlib import Path

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('roadtrip_blender_mcp', root / 'tools/blender-mcp/addon.py')
addon = importlib.util.module_from_spec(spec)
spec.loader.exec_module(addon)
addon.register()
bpy.context.scene.blendermcp_auto_start_server = False
bpy.context.scene.blendermcp_port = 9877
server = addon.BlenderMCPServer(host='127.0.0.1', port=9877)
bpy.types.blendermcp_server = server
server.start()
print('ROADTRIP_BLENDER_MCP_READY', flush=True)
