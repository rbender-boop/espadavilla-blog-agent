"""Print visible main text of a page (between </nav> ... footer), tags marked minimal. usage: text.py rel [maxchars]"""
import re, sys, html, pathlib
ROOT = pathlib.Path(r"C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE")
t = (ROOT / sys.argv[1]).read_bytes().decode("utf-8")
head = t.split("</head>")[0]
print("TITLE:", re.search(r"<title>(.*?)</title>", head, re.S).group(1))
print("DATEMOD:", re.findall(r'"dateModified"\s*:\s*"([^"]+)"', head))
body = t.split("</head>", 1)[1]
body = re.sub(r"<script.*?</script>|<style.*?</style>|<nav.*?</nav>|<footer.*?</footer>", "", body, flags=re.S)
body = re.sub(r"<!-- VE-(POPULAR-TAGS|RELATED-STORIES) START -->.*?END -->", "", body, flags=re.S)
body = re.sub(r"<(h[1-4])[^>]*>", lambda m: f"\n\n[{m.group(1).upper()}] ", body)
body = re.sub(r"<(p|li|tr|div)[^>]*>", "\n", body)
body = re.sub(r"<td[^>]*>", " | ", body)
body = html.unescape(re.sub(r"<[^>]+>", "", body))
body = re.sub(r"[ \t]+", " ", body); body = re.sub(r"\n\s*\n+", "\n", body)
n = int(sys.argv[2]) if len(sys.argv) > 2 else 20000
print(body[:n])
