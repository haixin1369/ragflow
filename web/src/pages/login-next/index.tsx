import { useAuth } from '@/hooks/auth-hooks';
import { useNavigatePage } from '@/hooks/logic-hooks/navigate-hooks';
import { useLogin } from '@/hooks/use-login-request';
import { rsaPsw } from '@/utils';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import Spotlight from '@/components/spotlight';
import { ButtonLoading } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { BgSvg } from './bg';
import './index.less';

type LoginFormContentProps = {
  form: UseFormReturn<any>;
  loading: boolean;
  onCheck: (params: any) => Promise<void>;
  t: ReturnType<typeof useTranslation>['t'];
};

function LoginFormContent({ form, loading, onCheck, t }: LoginFormContentProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-text-primary">
          {t('loginTitle')}
        </h2>
      </div>
      <div className=" w-full max-w-[540px] bg-bg-component backdrop-blur-sm rounded-2xl shadow-xl pt-14 pl-10 pr-10 pb-2 border border-border-button ">
        <Form {...form}>
          <form
            className="flex flex-col gap-8 text-text-primary "
            data-testid="auth-form"
            onSubmit={form.handleSubmit(onCheck)}
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t('emailLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="auth-email"
                      placeholder={t('emailPlaceholder')}
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t('passwordLabel')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        data-testid="auth-password"
                        type={'password'}
                        placeholder={t('passwordPlaceholder')}
                        autoComplete="current-password"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remember"
              render={({ field }) => (
                <FormItem>
                  <div className="flex gap-2 group">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                        }}
                        className="group-hover:border-border-default group-hover:bg-border-button"
                      />
                    </FormControl>
                    <FormLabel
                      className={cn('cursor-pointer', {
                        'text-text-disabled': !field.value,
                        'text-text-primary': field.value,
                      })}
                    >
                      {t('rememberMe')}
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ButtonLoading
              data-testid="auth-submit"
              type="submit"
              loading={loading}
              className="bg-metallic-gradient border-b-[#00BEB4] border-b-2 hover:bg-metallic-gradient hover:border-b-[#02bcdd] w-full my-8"
            >
              {t('login')}
            </ButtonLoading>
          </form>
        </Form>
      </div>
    </div>
  );
}

const Login = () => {
  const { navigateToHome } = useNavigatePage();
  const { login, loading: signLoading } = useLogin();
  const { t } = useTranslation('translation', { keyPrefix: 'login' });

  const { isLogin } = useAuth();
  useEffect(() => {
    if (isLogin) {
      navigateToHome();
    }
  }, [isLogin, navigateToHome]);

  const FormSchema = z.object({
    email: z
      .string()
      .email()
      .min(1, { message: t('emailPlaceholder') }),
    password: z.string().min(1, { message: t('passwordPlaceholder') }),
    remember: z.boolean().optional(),
  });
  type FormValues = z.infer<typeof FormSchema>;
  const form = useForm<FormValues>({
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
    resolver: zodResolver(FormSchema),
  });

  const onCheck = async (params: FormValues) => {
    try {
      const rsaPassWord = rsaPsw(params.password) as string;
      const code = await login({
        email: `${params.email}`.trim(),
        password: rsaPassWord,
      });
      if (code === 0) {
        navigateToHome();
      }
    } catch (errorInfo) {
      console.log('Failed:', errorInfo);
    }
  };

  return (
    <>
      <Spotlight opcity={0.4} coverage={60} color={'rgb(128, 255, 248)'} />
      <Spotlight
        opcity={0.3}
        coverage={12}
        X={'10%'}
        Y={'-10%'}
        color={'rgb(128, 255, 248)'}
      />
      <Spotlight
        opcity={0.3}
        coverage={12}
        X={'90%'}
        Y={'-10%'}
        color={'rgb(128, 255, 248)'}
      />
      <div className=" h-[inherit] relative overflow-auto">
        <BgSvg isPaused />

        <div className="z-20 absolute top-3 flex flex-col items-center mb-12 w-full text-text-primary">
          <div className="flex items-center mb-4 w-full pl-10 pt-10 ">
            <div className="w-12 h-12 p-2 rounded-lg flex items-center justify-center mr-3">
              <img
                src={'/logo.svg'}
                alt="logo"
                className="size-8 mr-[12] cursor-pointer"
              />
            </div>
            <div className="text-xl font-bold self-center">RAGFlow</div>
          </div>
          <h1 className="text-[36px] font-medium  text-center mb-2">
            {t('title')}
          </h1>
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[1050px] px-4 sm:px-6 lg:px-8">
          {/* Login Form */}
          <LoginFormContent
            form={form}
            loading={signLoading}
            onCheck={onCheck}
            t={t}
          />
        </div>
      </div>
    </>
  );
};

export default Login;
