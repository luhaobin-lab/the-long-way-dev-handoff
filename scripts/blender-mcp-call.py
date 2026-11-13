"""Use the actual MCP protocol and actual MCP for Blender server, saving tool receipts."""
import asyncio, json, os, sys
import importlib.util
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT = Path(__file__).resolve().parents[1]
USER_PROMPT = '然后，再用BLENDER MCP去建模整辆车，最后放到游戏里，让我们可以在游戏里以第一人称视角去开车。'

def server_python():
    """Prefer an explicit interpreter or the caller's install; retain the old local venv."""
    override = os.environ.get('BLENDER_MCP_PYTHON')
    if override:
        return str(Path(override).expanduser())
    if importlib.util.find_spec('blender_mcp') is not None:
        return sys.executable
    legacy_env = ROOT / '.tools/blender-mcp-env'
    relative_paths = ('Scripts/python.exe', 'bin/python', 'bin/python3') if os.name == 'nt' else ('bin/python', 'bin/python3')
    for relative_path in relative_paths:
        candidate = legacy_env / relative_path
        if candidate.is_file():
            return str(candidate)
    return sys.executable

async def main():
    tool = sys.argv[1] if len(sys.argv) > 1 else 'get_scene_info'
    argument = sys.argv[2] if len(sys.argv) > 2 else None
    env = {**os.environ, 'BLENDER_HOST': '127.0.0.1', 'BLENDER_PORT': '9877', 'DISABLE_TELEMETRY': 'true', 'BLENDER_MCP_DISABLE_TELEMETRY': 'true', 'MCP_DISABLE_TELEMETRY': 'true'}
    params = StdioServerParameters(command=server_python(), args=['-m', 'blender_mcp.server'], env=env)
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            if tool == 'list_tools':
                result = await session.list_tools()
            else:
                payload = {'code': Path(argument).read_text(), 'user_prompt': USER_PROMPT} if tool == 'execute_blender_code' else json.loads(argument or '{}')
                result = await session.call_tool(tool, payload, read_timeout_seconds=__import__('datetime').timedelta(seconds=300))
            data = result.model_dump(mode='json')
            dest = ROOT / 'artifacts/vehicle/mcp'
            dest.mkdir(parents=True, exist_ok=True)
            name = Path(argument).stem if argument and tool == 'execute_blender_code' else tool
            (dest / f'{name}-receipt.json').write_text(json.dumps(data, ensure_ascii=False, indent=2))
            if tool == 'list_tools':
                print(json.dumps([{'name': t.name, 'description': t.description[:200], 'inputSchema': t.inputSchema} for t in result.tools], ensure_ascii=False))
            else:
                print(json.dumps(data, ensure_ascii=False)[:16000])

asyncio.run(main())
