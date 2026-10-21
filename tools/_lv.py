import json, urllib.parse, subprocess
L=[
 {"name":"1 Plaza","roadW":72,"start":[235,790],"ctrl":[[120,190],[300,110],[480,190],[500,360],[425,450],[500,560],[480,740],[300,790],[120,740],[100,570],[175,470],[100,370]]},
 {"name":"2 Downtown","roadW":64,"start":[260,790],"ctrl":[[120,170],[300,110],[470,150],[525,260],[440,340],[300,330],[190,400],[270,490],[430,480],[520,570],[480,700],[340,770],[180,790],[95,700],[110,590],[70,470],[80,330]]},
 {"name":"3 Harbor Ave","roadW":62,"start":[108,690],"ctrl":[[110,730],[105,560],[105,390],[110,220],[180,110],[320,100],[410,150],[370,240],[450,300],[520,400],[500,520],[400,560],[360,640],[450,720],[480,800],[370,830],[250,810],[180,770]]},
]
open("levels.json","w").write(json.dumps(L))
url="file:///Users/patogtp/Desktop/BluBer%20Games/RaceLine/tools/track-lab.html#"+urllib.parse.quote(json.dumps(L))
subprocess.run(["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome","--headless=new","--hide-scrollbars","--window-size=1200,640","--screenshot=/Users/patogtp/Desktop/BluBer Games/RaceLine/tools/lab.png","--virtual-time-budget=2000",url],capture_output=True)
print("ok")
