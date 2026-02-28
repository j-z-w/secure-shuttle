import os

from convex import ConvexClient
from dotenv import load_dotenv

load_dotenv(".env.local")
CONVEX_URL = os.getenv("CONVEX_URL")
# or you can hardcode your deployment URL instead

client = ConvexClient(CONVEX_URL)

print(client.query("user_profiles:get"))

for tasks in client.subscribe("user_profiles:get"):
    print(tasks)
    # this loop lasts forever, ctrl-c to exit it