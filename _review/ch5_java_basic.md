<!-- 原文抽取自 Java基础问题.pdf，已做字符归一化；分行与个别错字为 PDF 抽取产物，评审时请以语义为准 -->

# 第5章 Java基础语法

Java基础语法高频问题
String
Q1.String、StringBuilder、StringBuffer的区别?
面试官您好,关于String三兄弟的区别,我从核心本质、可变性、线程安全和适用场景四个方面来回
答:
首先,三者的核心区别是可变性:String是不可变类,底层用finalchar数组(JDK9之后是byte数
组)存储,一旦创建内容不可修改;StringBuilder和StringBuffer是可变类,底层同样是数组但可以
动态扩容修改内容。
接下来是关键差异。第一,为什么String要设计成不可变?一是安全,字符串常量池共享、类加载、
网络参数等场景都依赖不可变;二是线程安全,不可变对象天然线程安全;三是缓存,哈希值可以缓
存,HashMap用String做key性能好。第二,StringBuilder和StringBuffer的区别是线程安全:
StringBuffer的方法都加了synchronized,线程安全但性能差;StringBuilder不加锁,线程不安全但
性能最高,是单线程环境下的唯一推荐。
第三,拼接性能。字符串用+拼接时,编译器和JVM会优化,简单拼接常量会在编译期直接合并,变
量拼接会优化成StringBuilder.append。但在循环里拼接,每次循环都会new一个StringBuilder,

<!--p53-->

性能很差,所以循环拼接必须显式使用StringBuilder。第四,扩容机制,StringBuilder和ArrayList
类似,默认容量16,扩容时新容量=旧容量*2+2。
最后是适用场景总结:字符串内容不变的场景用String;单线程下频繁拼接、修改用StringBuilder;
多线程环境需要线程安全且要拼接时用StringBuffer(实际项目中这种场景很少,一般直接加锁或用别
的方案)。
Q2.String的intern()方法有什么用?
面试官您好,关于intern()方法,我从核心作用、底层原理和实际应用三个方面来回答:
首先,intern()的核心作用是返回字符串在字符串常量池中的引用。JDK7之前常量池在永久代,
JDK7之后移到堆中。调用intern()时,如果常量池中已有内容相同的字符串,直接返回池中对象的引
用;如果没有,JDK7及以后会把当前字符串对象的引用放入常量池(不会复制对象),再返回该引
用。
这里有一个经典面试题:Strings1=newString("a")+newString("b")创建了几个对象?答案是:
s1本身一个对象,"a"和"b"各一个常量池对象,以及new出来的两个String对象,如果后续调用
s1.intern()还会把"ab"的引用放入常量池。面试官常考的是newString("abc")创建几个对象——答
案是2个:一个常量池对象,一个堆对象。
最后是实际应用。intern()可以用于字符串去重,大量相同字符串时节省内存(如JVM的
StringDeduplication就是类似思想),但JDK8之后字符串常量池也受堆大小限制,滥用intern()反
而可能因为常量池过大导致性能问题,生产环境要谨慎。
异常
Q3.Java的异常体系说一下?
面试官您好,关于Java异常体系,我从核心结构、受检异常与非受检异常的区别、异常处理原则和项
目实践四个方面来回答:
首先,Java所有异常和错误的根类是Throwable,它分为两大类:Error和Exception。Error是
JVM层面的严重错误,比如OutOfMemoryError、StackOverflowError、NoClassDefFoundError,
程序无法处理也不应该捕获。Exception是程序可以处理的异常,又分为RuntimeException运行时异
常和受检异常CheckedException。
受检异常必须显式处理(捕获或抛出),比如IOException、SQLException、
FileNotFoundException,编译器强制检查;非受检异常(RuntimeException及其子类)编译器不强
制处理,比如NullPointerException、IllegalArgumentException、ClassCastException、
IndexOutOfBoundsException。
然后是异常处理的几个关键点:第一,try-catch-finally中finally一定会执行(除非System.exit),
用于释放资源;第二,JDK7引入try-with-resources,自动关闭实现AutoCloseable的资源,比
finally更简洁,是生产环境的标准写法;第三,catch多个异常时,子类异常必须写在父类异常前面,

<!--p54-->

否则编译报错;第四,throws和throw的区别:throws声明方法可能抛出的异常,throw是实际抛
出异常对象。
最后是项目实践中的原则:第一,能用try-with-resources就不用finally手动关闭;第二,catch之
后要么记录日志要么抛出有意义的异常,禁止吞异常(catch了什么都不做);第三,业务异常建议自
定义异常类(继承RuntimeException,配合全局异常处理器@RestControllerAdvice统一返回错误
码),我在项目中用RRException统一处理,Redis故障时抛出并返回友好提示;第四,不在循环内
捕获异常,避免性能损耗和日志刷屏。
泛型
Q4.泛型是什么?泛型擦除是什么?
面试官您好,关于泛型,我从核心作用、泛型擦除原理、通配符和实际应用四个方面来回答:
首先,泛型的核心作用是编译期类型安全,让集合等容器在编译阶段就约束元素类型,避免运行期强
转的ClassCastException。Java的泛型是伪泛型,JDK5引入,底层通过类型擦除实现。
泛型擦除的核心原理是:编译时泛型类型信息会被擦除,泛型类型参数在字节码中被替换为它的边界
类型(无边界就替换为Object),并在必要的位置插入强制类型转换。比如List<String>和
List<Integer>在字节码层面都是List,运行时getClass()相同;泛型方法擦除后参数变成Object,调
用处插入cast指令。
然后是泛型的几个关键点:第一,泛型不支持基本类型,List<int>不合法,要用包装类;第二,泛型
不支持静态上下文,static字段和方法不能使用类泛型参数;第三,泛型不能直接newT()创建实例,
因为类型被擦除了;第四,泛型数组不能直接创建,newT[]不合法,因为数组在运行时会检查类型。
第五,通配符:<?extendsT>表示T或T的子类,只读不写(上界通配符);<?superT>表示T或
T的父类,只写不读(下界通配符)。这就是PECS原则:ProducerExtends,ConsumerSuper――
只往外读数据用extends,只往里写数据用super。
最后是实际应用。项目中泛型主要用在:集合类型约束、通用返回结果类Result<T>、通用分叶对象
PageResult<T>、通用工具类的类型安全转换。面试高频题:如何绕过泛型擦除向List<Integer>中放
字符串?通过反射调用add(Object)方法可以做到,这证明了擦除的存在。
反射
Q5.反射是什么?有哪些应用场景?
面试官您好,关于反射,我从核心定义、常用API、底层原理、应用场景和注意事项五个方面来回答:
首先,反射是Java在运行期获取类的完整结构信息(类名、方法、字段、注解、父类、接口)并动态
操作对象的能力。核心类有三个:Class代表类本身,Method代表方法,Field代表字段。获取Class
对象有三种方式:类名.class、对象.getClass()、Class.forName("全限定名"),其中forName最常
用,因为它可以在运行期按字符串动态加载类。

<!--p55-->

反射的核心应用场景:第一,SpringIOC的依赖注入就是通过反射读取类信息并实例化对象、注入依
赖;第二,JDBC的Class.forName加载驱动;第三,动态代理JDK实现基于反射生成代理类;第
四,框架层面的注解处理,比如Spring扫描@Component注解并通过反射创建Bean;第五,序列
化框架Jackson、Fastjson通过反射读写对象字段。
然后是反射的底层原理和性能:反射调用比直接调用慢,主要开销在方法查找、安全检查、参数装箱
拆箱,JDK内部有反射调用的优化(如MethodHandle、膨胀阈值),但业务代码中高频路径应避免
使用反射。同时反射可以访问私有成员(setAccessible(true)),会破坏封装,也有安全风险,禁止在
不可信输入上直接使用反射。
最后是注意事项:第一,反射调用性能敏感场景要缓存Method/Field对象,不要每次都
getMethod;第二,获取泛型信息要用Type而不是Class;第三,反射抛出的
InvocationTargetException包装了真实异常,要用getCause()取原始异常。Spring中我用的
@Autowired字段注入底层就是反射赋值,构造器注入底层是反射调构造方法。
IO/NIO
Q6.BIO、NIO、AIO的区别?
面试官您好,关于IO模型,我从核心定义、三者区别、NIO核心组件和实际应用四个方面来回答:
首先,BIO是阻塞IO,每个连接对应一个线程,线程在read/write时阻塞等待数据,连接多了线程数
爆炸,不适合高并发;NIO是非阻塞IO,基于Selector多路复用器,一个线程可以管理多个连接,连
接有事件才处理,适合连接多但活跃度低的场景;AIO是异步IO,读写操作提交后立即返回,完成时
回调通知,Java中AIO实际应用很少,Linux下的异步IO支持也不完善,一般不提。
NIO的三个核心组件:Channel通道(双向,类似流但可读可写)、Buffer缓冲区(读写都经过
Buffer,flip切换读写模式)、Selector选择器(注册多个Channel,监听OP_ACCEPT、
OP_READ、OP_WRITE事件)。NIO的经典应用就是Netty,而Redis的单线程模型也是基于IO多路
复用(epoll),这和NIO是同一个思想。
这里我想重点说明NIO和BIO的根本区别:BIO是"来一个连接起一个线程",线程大部分时间阻塞在
IO等待上;NIO是"一个线程轮询所有连接的事件",只有数据就绪才去处理,线程利用率高得多。这
也是为什么高并发服务器必须用NIO模型。
最后是实际应用。SpringMVC传统的Tomcat是BIO模型,Tomcat8.5+支持NIO模式;RPC框架
Dubbo底层用Netty(NIO);项目中的文件上传下载、批量导出通过IO流处理时注意用缓冲流
(BufferedInputStream)提升性能,大文件用流式处理避免一次性加载进内存。

<!--p56-->

