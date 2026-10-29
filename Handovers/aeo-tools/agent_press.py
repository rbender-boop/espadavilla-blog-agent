import pathlib
p = pathlib.Path(r"C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\src\lib\publish\site-chrome.ts")
b = p.read_bytes()
old = b'<li><a href="/about">About the Authors</a></li></ul>'
new = b'<li><a href="/about">About the Authors</a></li><li><a href="/press">Press</a></li></ul>'
assert b.count(old) == 1
p.write_bytes(b.replace(old, new))
print("ok")
